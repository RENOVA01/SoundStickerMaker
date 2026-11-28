  // VAN V5 experimental channel transport. No feature flag override for channels.
  const channelFlag = 'sound_stickers_channels_send_enabled';
  const channelId = c => String(c?.id?._serialized || c?.id?.$1 || c?.id || '');
  const channelRole = c => String(c?.newsletterMetadata?.membershipType || '').toLowerCase();
  const isChannel = c => /@newsletter$/.test(channelId(c));
  const canPost = c => isChannel(c) && ['owner','admin'].includes(channelRole(c)) && c.isReadOnly !== true && c.canSend !== false;
  function channelEnabled() {
    return ns('WAWebABProps').getABPropConfigValue(channelFlag) === true;
  }
  function channelModels() {
    const col = ns('WAWebCollections').WAWebNewsletterCollection;
    if (!col || typeof col.getModelsArray !== 'function') throw new Error('Daftar saluran tidak tersedia di versi WhatsApp Web ini.');
    return col.getModelsArray();
  }
  W.listChannels = function () {
    return channelModels().filter(canPost).map(c => ({id: channelId(c), name: String(c.newsletterMetadata?.name || c.formattedTitle || c.name || 'Saluran'), role: channelRole(c)}));
  };
  W.channelDiagnostics = function () {
    let enabled = null, count = null;
    try { enabled = channelEnabled(); } catch (_) {}
    try { count = W.listChannels().length; } catch (_) {}
    const d = {enabled, writableChannels: count, modules: {}};
    for (const n of ['WAWebPrepRawMedia','WAWebMediaMmsV4Upload','WAWebNewsletterSendMessageJob','WAWebNewsletterUpdateMsgsRecordsJob','WAWebCollections','WAWebMediaStorage','WAWebMsgDataFromModel']) {
      try { d.modules[n] = !!ns(n); } catch (_) { d.modules[n] = false; }
    }
    log('info','van:channel-diagnostics',d);
    return d;
  };
  async function publishChannelSticker(chat, webp, info, audio) {
    // Channel sticker images use the unencrypted newsletter media upload route.
    const Opaque = def('WAWebMediaOpaqueData');
    const prepared = ns('WAWebPrepRawMedia').prepRawMedia(await Opaque.createFromData(webp,'image/webp'), {asSticker:true});
    const md = await prepared.waitForPrep();
    if (!md || md.type !== 'sticker' || !md.filehash) throw new Error('Persiapan WebP saluran gagal.');
    if (info.isAnimated && md.isAnimated === false) throw new Error('WhatsApp mengubah animasi menjadi stiker diam. Pengiriman dibatalkan.');
    if (!(md.mediaBlob instanceof Opaque)) md.mediaBlob = await Opaque.createFromData(md.mediaBlob, 'image/webp');
    const media = ns('WAWebMediaStorage').getOrCreateMediaObject(md.filehash);
    md.renderableUrl = md.mediaBlob.url();
    media.consolidate(md.toJSON());
    md.mediaBlob.autorelease();
    if (ns('WAWebMediaDataUtils').shouldUseMediaCache(ns('WAWebMmsMediaTypes').castToV4(media.type))) {
      ns('WAWebMediaInMemoryBlobCache').InMemoryMediaBlobCache.put(media.filehash, md.mediaBlob.formData());
    }
    const mediaType = ns('WAWebMmsMediaTypes').msgToMediaType({type: 'sticker', isGif: false, isNewsletter: true});
    const result = await ns('WAWebMediaMmsV4Upload').uploadUnencryptedMedia({
      mimetype: md.mimetype, mediaObject: media, mediaType,
      calculateToken: ns('WAMediaCalculateFilehash').getRandomFilehash
    });
    const entry = result?.mediaEntry;
    if (!entry?.handle) throw new Error('Upload WebP saluran tidak menghasilkan media handle.');
    md.set({clientUrl:entry.mmsUrl,deprecatedMms3Url:entry.deprecatedMms3Url,directPath:entry.directPath,
      mediaKey:entry.mediaKey,mediaKeyTimestamp:entry.mediaKeyTimestamp,filehash:media.filehash,
      encFilehash:entry.encFilehash,uploadhash:entry.uploadHash,size:media.size,mediaHandle:entry.handle});
    const Key = def('WAWebMsgKey');
    const me = ns('WAWebUserPrefsMeUser').getMaybeMePnUser();
    if (!me) throw new Error('Identitas akun WhatsApp tidak tersedia.');
    const msgKey = new Key({from:me,to:chat.id,id:await Key.newId(),selfDir:'out'});
    const payload = {...md.toJSON(),id:msgKey,ack:0,from:me,to:chat.id,local:true,self:'out',
      t:Math.floor(Date.now()/1000),isNewMsg:true,type:'sticker',mimetype:'image/webp',
      isAnimated:!!info.isAnimated,fullWidth:info.lado||512,fullHeight:info.lado||512,emojis:['🔊'],stickerAudio:audio};
    delete payload.__x_id;
    const msg = new (ns('WAWebCollections').Msg.modelClass)(payload);
    if (!(msg.stickerAudio || msg.attributes?.stickerAudio)) throw new Error('Model saluran membuang stickerAudio. Pengiriman dibatalkan.');
    // Validate serialized audio before dispatch if the serializer exposes it.
    const record = ns('WAWebMsgDataFromModel').msgDataFromMsgModel(msg);
    const records = ns('WAWebNewsletterUpdateMsgsRecordsJob');
    const send = ns('WAWebNewsletterSendMessageJob');
    if (typeof msg.avParams !== 'function' || typeof chat.id.toJid !== 'function') throw new Error('API saluran berubah.');
    await records.addNewsletterMsgsRecords([record]);
    chat.msgs.add(msg);
    const response = await send.sendNewsletterMessageJob({msg,type:'media',newsletterJid:chat.id.toJid(),mediaMetadata:msg.avParams(),mediaHandle:entry.handle});
    if (!response?.success) {
      log('warn','van:channel-rejected',{success:false});
      throw new Error('Server menolak atau belum mengonfirmasi stiker saluran. Jangan kirim ulang sebelum memeriksa saluran.');
    }
    if (response.ack?.t) msg.t = response.ack.t;
    if (response.serverId != null) msg.serverId = response.serverId;
    chat.t = msg.t;
    // Only set acknowledged state after an actual success response.
    try { msg.updateAck(1,true); await records.updateNewsletterMsgRecord(msg); }
    catch (_) { log('warn','van:channel-local-sync',{serverAccepted:true}); }
    log('info','van:channel-ack',{serverAccepted:true,localAudio:!!(msg.stickerAudio||msg.attributes?.stickerAudio)});
    return msg;
  }
  W.publishChannel = async function ({webp,ogg,info}, {channelId: targetId,onProgress}={}) {
    const prog = onProgress || (()=>{});
    if (!webp || !ogg || !webp.size || !ogg.size || webp.size > 980000 || ogg.size > 980000) throw new Error('WebP dan OGG harus berisi data dan masing-masing maksimal 980 KB.');
    if (!channelEnabled()) throw new Error('Fitur stiker suara saluran belum aktif di akun/WhatsApp Web ini.');
    const chat = channelModels().find(c => channelId(c) === targetId);
    if (!chat || !canPost(chat)) throw new Error('Pilih saluran yang kamu kelola sebagai admin atau owner.');
    W.channelDiagnostics();
    prog('Mengunggah audio OGG…');
    // The existing sound-sticker attachment uploader produces stickerAudio.
    // Whether a newsletter accepts this encrypted audio descriptor is unverified.
    const audio = await W.uploadAudio(ogg, info.segundosAudio ?? info.duracionAudio, chat);
    if (!canPost(chat) || !channelEnabled()) throw new Error('Izin atau fitur saluran berubah.');
    prog('Mengunggah WebP dan mengirim ke saluran…');
    const msg = await publishChannelSticker(chat, webp, info, audio);
    return {chat,msg};
  };
