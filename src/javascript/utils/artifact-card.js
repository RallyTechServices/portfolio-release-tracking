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
  },
  _buildHtml: function () {
      var html = [];

      if (!this.record.get('__isOrphan') && this.record.get('DisplayColor')){
              var artifactColorDiv = {
                  tag: 'div',
                  cls: 'artifact-color'
              };
            artifactColorDiv.style = {
                backgroundColor: this.record.get('DisplayColor')
            };
            html.push(Ext.DomHelper.createHtml(artifactColorDiv));
      }
      html.push('<div class="card-table-ct"><table class="card-table"><tr>');

      Ext.Array.push(
          html,
          _.invoke(
              _.compact([this.contentLeftPlugin, this.contentRightPlugin]),
              'getHtml'
          )
      );

      html.push('</tr></table>');

      if (this.iconsPlugin) {
          html.push(this.iconsPlugin.getHtml());
      }

      html.push('</div>');

      return html.join('\n');
  }

});
