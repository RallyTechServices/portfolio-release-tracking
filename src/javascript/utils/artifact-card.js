 Ext.define('CArABU.technicalservices.TrackingCard', {
   extend: 'Rally.ui.cardboard.Card',
   alias: 'widget.trackingcard',

   constructor: function(config){
      this.mergeConfig(config);
      this.hidden = this.record.get('__isHidden') || false;
      this.callParent(arguments);
   },

   setupPlugins: function () {


      var plugins = [
          {ptype: 'rallycardpopover'},
          {ptype: 'trackingcardcontentleft'}
      ];

      return _.uniq(plugins, 'ptype');
  }

});
