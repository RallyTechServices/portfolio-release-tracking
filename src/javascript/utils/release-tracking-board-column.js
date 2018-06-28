    Ext.define('CArABU.technicalservices.portfolioreleasetracking.BoardColumn', {
        extend: 'Rally.ui.cardboard.Column',
        alias: 'widget.artifactboardcolumn',

        _queryForData: function() {
          this.store.on('load', this._onStoreLoad, this);
          this._createAndAddCardsFromStore(this.store);
        },
        isMatchingRecord: function(record) {
            return true;
        }
    });
