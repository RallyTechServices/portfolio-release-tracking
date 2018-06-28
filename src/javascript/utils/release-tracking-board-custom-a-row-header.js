
    Ext.define('CArABU.technicalservices.portfolioreleasetracking.BoardRowHeader', {
      extend: 'Rally.ui.cardboard.row.Header',
      alias: 'widget.artifactboardrowheader',
        _getTitle: function() {
            return this.getValue();
        }
    });
