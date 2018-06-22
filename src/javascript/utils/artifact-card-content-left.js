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
                           '<div class="dependency {dep}"></div>',
                           '<div class="story-summary">{summary}</div>',
                           '</span>',
                       '</div>']);
               }

               return this.headerTpl;
           }
       },

       nonDisplayableFields: ['PlanEstimate', 'FormattedID', 'Owner', 'PreliminaryEstimate', 'Estimate'],

       getCardHeader: function() {
             var record = this.card.getRecord(),
                 groupedItem = record.get('__isOrphan') && !record.get('__isHidden'),
                 formattedId = record.get('FormattedID'),
                 usePoints = this.card.usePoints,
                 data = {};
                 data.dep = "";

              if (groupedItem){

                data.idWidth = 20 + (formattedId.length * 8);
                data.formattedId = "<div class='formatted-id-template'>US/DE</div>";
                if (this.card.usePoints){
                  data.summary = Ext.String.format("{0} / {1}", record.get('__acceptedPoints'), record.get('__totalPoints'));
                } else {
                  data.summary = Ext.String.format("{0} / {1}", record.get('__acceptedCount'), record.get('__totalCount'));
                }
                return this.self.getHeaderTpl().apply(data);

              }

              if (formattedId) {
                 data.idWidth = 20 + (formattedId.length * 8);
                 //if (record.get('__dependency')){
                //}
                 data.formattedId = Rally.ui.cardboard.plugin.CardContentLeft.getIdTpl().apply(record.data);
                 if (this.card.usePoints){
                   if (record.get('LeafStoryPlanEstimateTotal') >= 0){
                     data.summary = Ext.String.format("{0} / {1}", record.get('AcceptedLeafStoryPlanEstimateTotal'), record.get('LeafStoryPlanEstimateTotal'));
                   } else {
                        data.dep = "type-indicator picto icon-predecessor";
                       data.summary = Ext.String.format("{0} Points", record.get('PlanEstimate') || 0);
                   }
                 } else {
                   if (record.get('LeafStoryCount') >= 0){
                     data.summary = Ext.String.format("{0} / {1}", record.get('AcceptedLeafStoryCount'), record.get('LeafStoryCount'));
                   } else {
                     data.dep = "type-indicator picto icon-predecessor";
                     data.summary = "";
                   }
                 }

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
