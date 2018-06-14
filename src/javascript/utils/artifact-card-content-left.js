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
                           '<span class="userstories-template clickable">',
                           '<div class="story-summary">{summary}</div>',
                           '</span>',
                       '</div>']);
               }

               return this.headerTpl;
           }
       },

       getCardHeader: function() {
             var record = this.card.getRecord(),
                 formattedId = record.get('FormattedID'),
                 data = {};

             if (formattedId) {
                 data.idWidth = 20 + (formattedId.length * 8);
                 data.formattedId = Rally.ui.cardboard.plugin.CardContentLeft.getIdTpl().apply(record.data);
                 if (this.card.usePoints){
                   if (record.get('LeafStoryPlanEstimateTotal') >= 0){
                     data.summary = Ext.String.format("{0} / {1}", record.get('AcceptedLeafStoryPlanEstimateTotal'), record.get('LeafStoryPlanEstimateTotal'));
                   } else {
                      data.summary = Ext.String.format("{0} Points", record.get('PlanEstimate') || 0);
                   }

                 } else {
                   if (record.get('LeafStoryCount') >= 0){
                     data.summary = Ext.String.format("{0} / {1}", record.get('AcceptedLeafStoryCount'), record.get('LeafStoryCount'));
                   } else {
                     data.summary = "";
                   }

                 }

                 return this.self.getHeaderTpl().apply(data);
             }

             return '';
         }

   });
