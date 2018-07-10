
self.addEventListener('install', function (event) {
  console.log('V1 installing…');
});

self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
  console.log('V1 now ready to handle fetches!');
});

function binToHex(bytes) {
    var len = bytes.length;
    var rv = "";
    for (var i = 0; i < len; i++) {
        if (bytes[i] < 16) {
            rv += "0" + bytes[i].toString(16);
        } else {
            rv += bytes[i].toString(16);
        }
    }
    return rv;
}
function hexToBin(str) {
    var len2 = str.length;
    var len = Math.floor(len2 / 2);
    var rv = new Array(len);
    for (var i = 0; i < len; i++) {
        rv[i] = parseInt(str.slice(i * 2, i * 2 + 2), 16);
    }
    return rv;
}
function binToBase64(bytes) {
    return btoa(String.fromCharCode.apply(null, bytes));
}

function extractUrl(url) {
  var idx = url.indexOf('?');
  var search = url.slice(idx);
  var path = url.slice(0, idx);
  var elems = path.split('/');
  var oid = elems[5];
  var keyHex = elems[6];
  var hashHex = elems[7];
  var key = hexToBin(keyHex);
  var hash = hexToBin(hashHex);
  //console.log("sw-key", keyHex, binToBase64(key));
  //console.log('sw-hash', hashHex, binToBase64(hash));
  var url2 = "https://storage.googleapis.com/flowy-depot/" + oid + search;
  return {url:url2, key:key, hash:hash};
}

function getIt(url, key, hash) {
  var hdrs = new Headers();
  hdrs.append('x-goog-encryption-algorithm', 'AES256');
  hdrs.append('x-goog-encryption-key', binToBase64(key));
  hdrs.append('x-goog-encryption-key-sha256', binToBase64(hash));
  var init = {method: 'GET', headers: hdrs, mode: 'cors'};
  var req = new Request(url, init);
  return fetch(req);
}

self.addEventListener('fetch', function (event) {
  console.log('fetch fired');
  var url = event.request.url;
  if (url.lastIndexOf(__WEB_BASE__ + '/fe/proxy/', 0) === 0 || 
      url.lastIndexOf('https://flowy.jp/fe/proxy/', 0) === 0) {
    console.log('url matched');
    var props = extractUrl(event.request.url);
    event.respondWith(getIt(props.url, props.key, props.hash));
  }
});