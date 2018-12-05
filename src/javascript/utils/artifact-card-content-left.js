Ext.define('CArABU.technicalservices.plugin.TrackingCardContentLeft', {
       alias: 'plugin.trackingcardcontentleft',
       extend: 'Rally.ui.cardboard.plugin.CardContentLeft',

       statics: {
           getIdTpl: function() {
               if (!this.idTpl) {
                   this.idTpl = Ext.create('Rally.ui.renderer.template.FormattedIDTemplate');
               }
               return this.idTpl;
           },

           getHeaderTpl: function() {
               if (!this.headerTpl) {
                   this.headerTpl = Ext.create('Ext.XTemplate', [
                       '<div class="left-header">',
                        '<div class="id" style="min-width: {idWidth}px">{formattedId}</div>',
                           '<div class="dependency {dep} field-content dependency"></div>', //{depID}
                           //'<div class="field-content ItemSummary">{summary}</div>',
                           '</span>',
                       '</div>']);
               }
               return this.headerTpl;
           }
       },

       nonDisplayableFields: ['PlanEstimate', 'FormattedID', 'Owner', 'PreliminaryEstimate', 'Estimate'],

       getCardHeader: function() {
             var record = this.card.getRecord(),
             rData = Ext.clone(record.getData()),
                 groupedItem = rData.__groupedItem,
                 dependency = rData.__dependency,
                 childDeps = record.hasDependencies(),
                 formattedId = rData.FormattedID,
                 usePoints = this.card.usePoints,
                 data = {};
                 data.dep = "";
                 data.depID = "";


              if (groupedItem){
                data.formattedId = "<div class='formatted-id-template'>" + record.getGroupName() + "</div>";
                data.idWidth = 20 + (record.getGroupName().length * 8);
                if (dependency){
                   data.dep = "type-indicator picto icon-predecessor" ;
                   data.depID = dependency;
                }
                return this.self.getHeaderTpl().apply(data);
              }

              if (formattedId) {
                 data.idWidth = 20 + (formattedId.length * 8);
                 var recordData = record.get('__items') && record.get('__items')[0];
                 if (childDeps){
                    data.dep = "type-indicator picto icon-predecessor";
                 }

                 data.formattedId = Rally.ui.cardboard.plugin.CardContentLeft.getIdTpl().apply(recordData);
                 return this.self.getHeaderTpl().apply(data);
             }
             return '';
         },
         _isDisplayableField: function(fieldName){
           var record = this.card.getRecord(),
               groupedItem = record.get('__isOrphan') && !record.get('__isHidden');

            if (groupedItem){
              return false;
            }
            return !_.contains(this.nonDisplayableFields.concat(this.footerFields), fieldName);
          }
   });
