
self.addEventListener('install', function (event) {
  console.log('V1 installing…');
});

self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
  console.log('V1 now ready to handle fetches!');
});

function binToHex(bytes) {
    var str = btoa(String.fromCharCode(...bytes));
    var rv = str.replace(/\+/g, '-').replace(/\//g, '.').replace(/=/g, '_');
    return rv;
}
function hexToBin(str) {
    var str2 = str.replace(/-/g, '+').replace(/\./g, '/').replace(/_/, '=');
    var str3 = atob(str2);
    var rv = new Array(str3.length);
    for (var i = 0; i < str3.length; i++) {
        rv[i] = str3.charCodeAt(i);
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