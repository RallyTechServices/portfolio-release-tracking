Ext.define('CArABU.technicalservices.ArtifactCardModelBuilder',{
    singleton: true,

    build: function(modelType, newModelName) {
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: modelType,
            success: function(model) {

              var fields = [{
                    name: '__dateBucket',
                    defaultValue:  null
                },{
                    name: '__positionX'
                },{
                    name: '__positionY'
                },{
                    name: '__predecessors'
                }];

                var new_model = Ext.define(newModelName, {
                    extend: model,
                    logger: new CArABU.technicalservices.Logger(),
                    fields: fields,
                    calculate: function(iterations, dateField) {
                        this.logger.log('update', this.get('FormattedID'), dateField);
                        var dt = this.get(dateField),
                            db = null;

                        _.each(iterations, function(i){
                           console.log('iteration',i.StartDate, i.EndDate,dt);
                           if ((i.StartDate < dt ) && (i.EndDate >= dt)){
                              db = i.EndDate;
                              return false;
                           }
                        });
                        console.log('update the model ', db);
                        this.set('__dateBucket',db);
                    }
                });
                deferred.resolve(new_model);
            }
        });
        return deferred;
    }
});
