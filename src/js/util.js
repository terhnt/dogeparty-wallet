//unowallet-specific utility functions

function formatHtmlPrice(price) {
  num = noExponents(parseFloat(price).toFixed(8));
  var parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  parts[1] = parts[1].replace(/(0{0,8}$)/, '<span class="text-muted">$1</span>')
  return parts.join('.');
}

function cleanHtmlPrice(price) {
  var clean = price.split("<span");
  return parseFloat(clean[0]);
}

function feedImageUrl(image_name) {
  var url = cwBaseURLs()[0];
  url += USE_TESTNET ? '/_t_feed_img/' : '/_feed_img/';
  url += image_name + '.png';
  return url;
}

function assetImageUrl(image_name) {
  var url = cwBaseURLs()[0];
  url += USE_TESTNET ? '/_t_asset_img/' : '/_asset_img/';
  url += image_name + '.png';
  return url;
}

function getCurrentPage() {
  return (window.location.hash.replace('#', '/'));
}

function decodeJsonBet(jsonBetBase64) {
  var jsonBet;
  try {
    $.jqlog.debug(atob(jsonBetBase64));
    jsonBet = JSON.parse(atob(jsonBetBase64));

  } catch (e) {
    return false;
  }
  if (typeof(jsonBet) != 'object') {
    return false;
  }
  if (jsonBet.command == undefined || jsonBet.command != 'bet') {
    return false;
  }
  var numbers = {'wager': 1, 'counterwager': 1, 'target_value': 1, 'expiration': 1, 'leverage': 1, 'bet_type': 1};
  for (var e in numbers) {
    if (jsonBet[e] == undefined || isNaN(jsonBet[e])) {
      return false;
    }
  }
  if (BET_TYPES_SHORT[jsonBet.bet_type] == undefined) {
    return false;
  }
  if (jsonBet.deadline == undefined || !moment(jsonBet.deadline).isValid()) {
    return false;
  }
  if (jsonBet.feed_address == undefined || !CWBitcore.isValidAddress(jsonBet.feed_address)) {
    return false;
  }
  if (jsonBet.source == undefined) {
    return false;
  }
  var addresses = WALLET.getAddressesList(true);
  var isMine = false;
  for (var i = 0; i < addresses.length; i++) {
    if (addresses[i][0] == jsonBet.source) {
      isMine = true;
    }
  }
  if (!isMine) {
    return false;
  }
  return jsonBet;
}

function expireDate(expire_index) {
  var expire_in = expire_index - WALLET.networkBlockHeight();
  return new Date((new Date()).getTime() + (expire_in * APPROX_SECONDS_PER_BLOCK * 1000));
}

function checkCountry(action, callback) {
  if (restrictedAreas[action] && restrictedAreas[action].indexOf(USER_COUNTRY) != -1) {
    var message = i18n.t('forbiden_country');

    if (action in RESTRICTED_AREA_MESSAGE) {
      message += '<br />' + i18n.t(RESTRICTED_AREA_MESSAGE[action]);
    }

    if (USE_TESTNET || USE_REGTEST) { //allow the user to bust on through this alert on testnet
      bootbox.dialog({
        title: i18n.t("country_warning"),
        message: message + "<br/><br/>" + i18n.t("testnet_proceed_anyway"),
        buttons: {
          "success": {
            label: i18n.t("proceed_anyway"),
            className: "btn-success",
            callback: function() {
              callback();
            }
          },
          "cancel": {
            label: i18n.t("close"),
            className: "btn-danger",
            callback: function() {
              bootbox.hideAll();
              return false;
            }
          }
        }
      });
    } else {
      bootbox.dialog({
        title: i18n.t("country_warning"),
        message: message,
        buttons: {
          "cancel": {
            label: i18n.t("close"),
            className: "btn-danger",
            callback: function() {
              bootbox.hideAll();
              return false;
            }
          }
        }
      });
    }
  } else {
    callback();
  }
}

function orderMultisigAddress(address) {
  var addresse_array = address.split('_');
  if (addresse_array.length > 1) {
    var required_sig = addresse_array.shift();
    var provided_sig = addresse_array.pop();
    return required_sig + '_' + addresse_array.sort().join("_") + '_' + provided_sig;
  } else {
    return addresse_array.pop();
  }

}

function pubkeyToPubkeyhash(pubkey) {
  return CWBitcore.pubKeyToPubKeyHash(pubkey);
}

function getPubkeyForAddress(address, callback) {
  if (!CWBitcore.isValidAddress(address) && !CWBitcore.isValidMultisigAddress(address)) {
    callback([]);
  }
  var pubkeys = [];
  var addresses = address.split('_');
  for (var a in addresses) {
    var addr = addresses[a];
    if (CWBitcore.isValidAddress(addr)) {
      var addrObj = WALLET.getAddressObj(addr);
      if (addrObj) {
        pubkeys.push(addrObj.PUBKEY);
      }
    }
  }
  if (addresses.length > pubkeys.length) {
    failoverAPI("get_pubkey_for_address", {'address': address}, function(data) {
      if (data) {
        for (var p in data) {
          if (pubkeys.indexOf(data[p]) == -1) {
            pubkeys.push(data[p]);
          }
        }
      }
      callback(pubkeys);
    });
  } else {
    callback(pubkeys);
  }
}

function getLinkForCPData(type, dataID, dataTitle, htmlize) {
  if (typeof(dataTitle) === 'undefined' || dataTitle === null) dataTitle = dataID;
  if (typeof(htmlize) === 'undefined' || htmlize === null) htmlize = true;
  if (typeof(type) === 'undefined') type = 'tx';
  var url = null;
  if (type == 'address') { //dataID is an address
    url = BLOCKEXPLORER_URL + '/address/' + dataID;
    //format multisig addresses
    if (dataTitle.indexOf("_") > -1) {
      var parts = dataTitle.split('_');
      dataTitle = "multisig " + parts[0] + " of " + parts[parts.length - 1];
      //remove first and last elements
      parts.shift();
      parts.pop();
      dataTitle += " (" + parts.join(', ') + ")";
    }
  } else if (type == 'tx') { //generic TX
    url = BLOCKEXPLORER_URL + '/tx/' + dataID;
  } else {
    assert(false, "Unknown type of " + type);
  }

  return htmlize ? ('<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + dataTitle + '</a>') : url;
}

function getTxHashLink(hash) {
  // TODO: add link to blockscan when possible
  var shortHash = hash.substr(hash.length - 5);
  if (hash.length == 128) {
    shortHash += '...' + hash.substr(64, 5);
  }
  var link = '<span rel="tooltip" title="' + hash + '" data-placement="top" data-container="body" class="shortHash">' + shortHash + '</span>';

  return link;
}

function getLinkForBlock(blockIndex, dataTitle, htmlize) {
  if (typeof(dataTitle) === 'undefined' || dataTitle === null) dataTitle = blockIndex;
  if (typeof(htmlize) === 'undefined' || htmlize === null) htmlize = true;
  var url = BLOCKEXPLORER_URL + '/block/' + blockIndex;
  return htmlize ? '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + dataTitle + '</a>' : url;
}

function getAddressLabel(address) {
  //gets the address label if the address is in this wallet
  return PREFERENCES['address_aliases'][hashToB64(address)] || address;
}

// Testing - Official project image load functions
function getAssetImageURL(asset) {
  // This will return the url of an image following these checks;
  // - is asset part of an official project
  //    - if so; Load from official projects feed .json
  // - is description an imgur URL
  //    - if so; Load image from that URL.
  // - finaly check if asset has a .json link in description
  //    - if so; Load image from that json.
  var type = '';
  var imageurl = '';
  var officialprojectsjson = ''; // The .json we search for official projects.
  var assetdescription = '';
  // todo: Load asset description
  // Check if asset belongs to an official project
  var official = isOfficialProject(asset);
  if(official) {
    var projectJSON = getOfficialProjectUrlJSON(getOfficialProject(asset));
    var i = 0;
    // Load data from projects json
    data = JSON.parse(getValue(projectJSON));
    obj = data;
    imageurl = obj[asset.toUpperCase()].img_url;
  }else if(assetdescription.toLowerCase().includes("imgur.com/")) {
    // Load data from assets description
    imageurl = assetdescription;
  }else if(assetdescription.toLowerCase().slice(-5) === '.json'){
    // Load data json from description
    imageurl = assetdescription;
  }else{
    // No Image
    imageurl = 'https://www.freeiconspng.com/uploads/no-image-icon-4.png';
  }
  return imageurl;
}

function getValue(xurl){
   var value= $.ajax({
      url: xurl,
      async: false
   }).responseText;
   return value;
}

// Check if asset belongs to official project
function isOfficialProject(asset) {
  // get project urls
  var jsonurls = '';
  var isOfficial = false;
  var obj;
  data = JSON.parse(getValue('https://terhnt.github.io/unoprojectfeed.json'));
  obj = data;
  jsonurls = obj.Projects.Url;

  // Work through all the urls and check for asset name
  var i = 0; // Project #
  while(i < jsonurls.length) {
    var x = 0; // Asset #
    pdata = JSON.parse(getValue(obj.Projects.Url[i].toString()));
      const projobj = pdata;
      var len = Object.keys(projobj).length;
      while(x < len){
        if(asset.toUpperCase() === Object.keys(projobj)[x].toUpperCase()){
          return true;
        }
        x++;
      }
    i++;
  }
  return false;
}

// Check if projectname is official
function isOfficialProjectName(projectname) {
    data = JSON.parse(getValue('https://terhnt.github.io/unoprojectfeed.json'));
    const obj = data;
    var pros = obj.Projects.Names;
    var i = 0;

    while(i < pros.length){
      if(projectname.toUpperCase() === pros[i].toUpperCase()){
        return true;
      }
      i++;
    }
  return false;
}

// Return official project name for asset
function getOfficialProject(asset) {
  // get project urls
  var res = false;
  var jsonurls = '';
  var isOfficial = false;
  var obj = {};
  data = JSON.parse(getValue('https://terhnt.github.io/unoprojectfeed.json'));
  obj = data;
  jsonurls = data.Projects.Url;
  // Work through all the urls and check for asset name
  var i = 0; // Project #
  while(i < jsonurls.length) {
    var x = 0; // Asset #
    pdata = JSON.parse(getValue(obj.Projects.Url[i].toString()));
    var projobj = pdata;
    var len = Object.keys(projobj).length;
    while(x < len){
      if(asset.toUpperCase() === Object.keys(projobj)[x].toUpperCase()){
        res = obj.Projects.Names[i];
      }
      x++;
    }
  i++;
  }
 return res;
}

function getOfficialProjectUrlJSON(projectname) {
  var res = null;
    data = JSON.parse(getValue('https://terhnt.github.io/unoprojectfeed.json'));
    const obj = data;
    var pros = obj.Projects.Names;
    var i = 0;

    while(i < pros.length){
      if(projectname.toUpperCase() === pros[i].toUpperCase()){
        res = obj.Projects.Url[i];
      }
      i++;
    }
return res;
}
