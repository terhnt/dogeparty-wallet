function MeltViewModel(props) { //DispenserViewModel(props) {
  var self = this;
  self.ADDRESS = props['address']; //will not change
  self.ASSET = props['asset']; //assetID (asset name), will not change.
  self.ASSET_LONGNAME = props['asset_longname']; //for subassets, this is the entire asset name (asset_longname). for everything else, this is == .ASSET
  self.ASSET_DISP_FULL = self.ASSET_LONGNAME || self.ASSET; //the human readable name of the asset
  self.ASSET_DISP = _.truncate(self.ASSET_LONGNAME || self.ASSET, SUBASSET_MAX_DISP_LENGTH); // truncate if necessary

  self.DIVISIBLE = props['divisible'] !== undefined ? props['divisible'] : true;
  self.description = ko.observable(props['description'] || '');

  self.meltQuantity = ko.observable(props['quantity'])
  //self.rawEscrowedBalance = ko.observable(props['rawEscrowedBalance'])
  //self.escrowedBalance = ko.observable(props['escrowedBalance'])
  //self.rawGiveRemaining = ko.observable(props['rawGiveRemaining'])
  //self.giveRemaining = ko.observable(props['giveRemaining'])
  //self.rawGiveQuantity = ko.observable(props['rawGiveQuantity'])
  //self.giveQuantity = ko.observable(props['giveQuantity'])
  self.rawSatoshirate = ko.observable(props['rawSatoshirate'])
  self.satoshirate = ko.observable(props['satoshirate'])

  self.assetType = ko.computed(function() {
    if(_.startsWith(self.ASSET, 'A') && !self.ASSET_LONGNAME) {
      return 'numeric';
    } else if(self.ASSET_LONGNAME) {
      return 'subasset';
    } else {
      return 'named';
    }
  }, self);

  self.meltAsset = function() {
    if (!WALLET.canDoTransaction(self.ADDRESS)) return false;

    bootbox.dialog({
      message: i18n.t("melt_asset_warning"), //i18n.t("close_dispenser_warning"),
      title: i18n.t("are_you_sure"),
      buttons: {
        success: {
          label: i18n.t("cancel"),
          className: "btn-default",
          callback: function() {
            //modal will disappear
          }
        },
        danger: {
          label: il8n.t("melt_asset"),//i18n.t("close_dispenser"),
          className: "btn-danger",
          callback: function() {
            WALLET.doTransaction(self.ADDRESS, "melt",
              {
                source: self.ADDRESS,
                asset: self.ASSET,
                quantity: self.meltQuantity
              },
              function(txHash, data, endpoint, addressType, armoryUTx) {
                var message = i18n.t("can_dispense_before_closing");
                if (armoryUTx) {
                  message = i18n.t("asset_will_be_melted") + " " + message;//i18n.t("dispenser_will_be_closed") + " " + message;
                } else {
                  message = il8n.t("asset_has_been_melted") + " " + message;//i18n.t("dispenser_has_been_closed") + " " + message;
                }
                WALLET.showTransactionCompleteDialog(message + " " + i18n.t(ACTION_PENDING_NOTICE), message, armoryUTx);
              }
            );
          }
        }
      }
    });
  };
}
