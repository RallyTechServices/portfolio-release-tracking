Ext.define('CArABU.technicalservices.portfolioreleasetracking.ArtifactModel', {
        extend: 'Rally.data.Model',

        fields: [{
           name: 'id'
        },{
          name: 'Project'
        },{
          name: 'Name',
          defaultValue: ""
        },{
          name: 'State',
          defaultValue: ""
        },{
          name: '__risk',
          defaultValue: ""
        },{
          name: 'DisplayColor',
          defaultValue: ""
        },{
          name: 'FormattedID',
          defaultValue: null
        },{
          name: '__items',
          defaultValue: null
        },{
           name: '__groupedItem',
           defaultValue: false
        },{
          name: '__totalCount',
          defaultValue: 0
        },{
          name: '__acceptedCount',
          defaultValue: 0
        },{
          name: '__totalPoints',
          defaultValue: 0
        },{
          name: '__acceptedPoints',
          defaultValue: 0
        },{
          name: '__childDependency',
          defaultValue: null
        },{
           name: '__childDependencies',
           defaultValue: false
       },{
           name: '__peerDependencies',
           defaultValue: false
       },{
          name: '__dateBucket',
          defaultValue:  null
        },{
          name: '__doneStates',
          defaultValue: []
        },{
          name: '__riskField',
          defaultValue: ""
        },{
          name: '__atRiskValue',
          defaultValue: ""
        },{
          name: '__willNotCompleteValue',
          defaultValue: ""
        }],
         isSearch: function(){
            return false;
         },
         hasField: function(field){
            return true;
         },
         getId: function(){
            return this.get('id');
         },
         getType: function(){
            return this.get('__items') && this.get('__items')[0] && this.get('__items')[0]._type;
         },
         getOid: function(){
            return this.get('__items') && this.get('__items')[0] && this.get('__items')[0].ObjectID;
         },
         getField: function(fieldName){
            var field = _.find(this.getFields(), function(f){ return fieldName == f.name; });
            if (!field){
                field = {name: fieldName};
            }
            var type = field.type || 'string';
            field.isCollection = function(){ return false; }
            field.getType = function() { return type; }
            return field;

         },
         addItem: function(item){
            var items = this.get('__items') || [];

            items.push(item);
            if (this.get('__groupedItem') === false){
                this.set('Name',item.Name);
                this.set('FormattedID', item.FormattedID);
                this.set('DisplayColor', item.DisplayColor);
                if (item.State){
                  this.set('State', item.State.Name);
                }
                var riskField = this.get('__riskField');
                if (riskField && item[riskField]){
                   this.set('__risk', item[riskField]);
                }
            } else {

            }
            this.set('__totalCount', this._setTotalCount(items));
            this.set('__acceptedCount', this._setAcceptedCount(items));
            this.set('__totalPoints', this._setTotalPoints(items));
            this.set('__acceptedPoints', this._setAcceptedPoints(items));
            this.set('Project', item.Project.Name);
            this.set('__items', items);
            this.set('__peerDependencies', item.__peerDependencies);
         },
         getItemFilters: function(){

           if (this.get('__childDependencies')){
              //This is a PI
              return [{
                  property: 'Feature.ObjectID',  //TODO: FIX THIS to use the right name
                  value: this.get('__items')[0].ObjectID
              },{
                  property: 'DirectChildrenCount',
                  value: 0
              }];
           }

            var filters = _.map(this.get('__items'), function(i){
                 return {
                     property: 'ObjectID',
                     value: i.ObjectID
                 };
             });
             return Rally.data.wsapi.Filter.or(filters);
         },
         getItemModels: function(){
           var models = [];
           if (_.find(this.get('__items'), {_type: 'hierarchicalrequirement'})){
               models.push('HierarchicalRequirement');
           }
           if (_.find(this.get('__items'), {_type: 'defect'})){
               models.push("Defect");
           }

           if (models.length == 0){ //This is portfolioitem and we want to return a story model
             models.push('HierarchicalRequirement');
           }
           return models;
         },
         getGroupName: function(){
             var name = [];
             if (_.find(this.get('__items'), {_type: 'hierarchicalrequirement'})){
                 name.push("US");
             }
             if (_.find(this.get('__items'), {_type: 'defect'})){
                 name.push("DE");
             }
             if (this.get('__childDependency')){
                return name.join('/');
             }
             return "Orphaned " + name.join('/');
         },
         addPeerDependency: function(id){
             var peerDeps = this.get('__peerDependencies') || [];
             peerDeps.push(id);
             this.set('__peerDependencies',peerDeps);
         },
         addChildDependency: function(id){
             var childDeps = this.get('__childDependencies') || [];
             childDeps.push(id);
             this.set('__childDependencies',childDeps);
         },
         getStatus: function(){
            var state = this.get('State');
            if (state){
                if (_.contains(this.get('__doneStates'), state)){
                  return "done";
                }
            }

            var risk = this.get('__risk') || null;

            if (risk && risk === this.get('__atRiskValue')){
               return "atrisk";
            }
            if (risk && risk === this.get('__willNotCompleteValue')){
               return "willnotcomplete";
            }
            return null;
         },
         _hasChildDependencies: function() {
             return this.get('__childDependencies') && this.get('__childDependencies').length > 0;
         },
         _hasPeerDependencies: function() {
             return this.get('__peerDependencies') && this.get('__peerDependencies').length > 0;
         },
         hasDependencies: function(){
             return this._hasChildDependencies() || this._hasPeerDependencies();
         },
         _setTotalCount: function(items){
             if (this.get('__groupedItem')){
               return items.length;
             }
             return items.length > 0 && items[0].LeafStoryCount || 0;
         },
         _setTotalPoints: function(items){
           if (this.get('__groupedItem')){
             return Ext.Array.sum(_.map(items, function(i){
                   return i.PlanEstimate || 0;
             }));
           }
           return items.length > 0 && items[0].LeafStoryPlanEstimateTotal || 0;
         },
         _setAcceptedCount: function(items){
           if (this.get('__groupedItem')){
              return _.filter(items, function(i){ return i.AcceptedDate; }).length;
           }
           return items.length > 0 && items[0].AcceptedLeafStoryCount || 0;
         },
         _setAcceptedPoints: function(items){
           if (this.get('__groupedItem')){
             return Ext.Array.sum(_.map(items, function(i){
                if (i.AcceptedDate){
                   return i.PlanEstimate || 0;
                }
                return 0;
             }));
           }
           return items.length > 0 && items[0].AcceptedLeafStoryPlanEstimateTotal || 0;
         }
});
