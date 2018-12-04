Ext.define('CArABU.technicalservices.portfolioreleasetracking.DependencyMap', {

  boardX: 0,
  boardY: 0,
  xOffset: 0,
  yOffset: 0,

  constructor: function(config){
    Ext.apply(this,config);
    this._buildMap(config);
  },
  _buildMap: function(config){
      var board = config.board,
          cards = board.getCards();

      var dependencyMap = _.reduce(cards, function(h,cc){
          _.each(cc, function(c){
            if (c.getRecord().hasDependencies() && c.getRecord().get('FormattedID')){
                h[c.getRecord().get('FormattedID')] = c;
            }
          });
         return h;
      },{});

      var cards = [];
      _.each(board.getCards(), function(cs){
         _.each(cs, function(c){
          var dep = c.getRecord().get('__childDependency'),
              depParent = dependencyMap[dep];
          if (depParent){
            c.addDependentCards(depParent);
            depParent.addDependentCards(c);
          }
          _.each(cs, function(c){
              var depList = c.getRecord().get('__peerDependencies');
              _.each(depList, function(dep){
                  var peer = dependencyMap[dep];
                  if ( peer ) {
                      c.addPeerDependentCards(peer);
                      peer.addPeerDependentCards(c);
                  }
              });
          });
          cards.push(c)

        }, this);
      });
      this.dependencyMap = dependencyMap;
      this.cards = cards;
  },
  getDependencyCanvas: function(board, card){
    var cards = this.dependencyMap;
    if (card && card.getRecord() && card.getRecord().get('FormattedID')){
       cards = [this.dependencyMap[card.getRecord().get('FormattedID')]];
    }
    var boardX = board.getX(),
        boardY = board.getY(),
        yOffset = -boardY- 20; //subtract 20 becuase that is the top and bottom margins.
        items = [];

    _.each(cards, function(c){
        var p1x = c.getX(), p1y = c.getY();

        _.each(c.getPeerDependentCards(), function(dc){
            var p1 = c.getConnectorPoint(dc.getX(), dc.getY()),
                p2 = dc.getConnectorPoint(p1x,p1y);

            items.push({
                type: "circle",
                fill: 'blue',
                radius: 5,
                x: p1.x,
                y: p1.y + yOffset
            });
            items.push({
                type: "circle",
                fill: 'blue',
                radius: 5,
                x: p2.x,
                y: p2.y + yOffset
            });
            items.push({
                type: "path",
                path: Ext.String.format("M{0} {1} L {2} {3}",p1.x,p1.y+ yOffset,p2.x,p2.y+ yOffset),
                fill: "transparent",
                stroke: "blue",
                "stroke-width": "1"
            });
        });

        _.each(c.getDependentCards(), function(dc){
            var p1 = c.getConnectorPoint(dc.getX(), dc.getY()),
                p2 = dc.getConnectorPoint(p1x,p1y);

            items.push({
                type: "circle",
                fill: 'red',
                radius: 5,
                x: p1.x,
                y: p1.y + yOffset
            });
            items.push({
                type: "circle",
                fill: 'red',
                radius: 5,
                x: p2.x,
                y: p2.y + yOffset
            });
            items.push({
                type: "path",
                path: Ext.String.format("M{0} {1} L {2} {3}",p1.x,p1.y+ yOffset,p2.x,p2.y+ yOffset),
                fill: "transparent",
                stroke: "red",
                "stroke-width": "1"
            });
        });
    });

          if (items.length === 0){
             return null;
          }

          _.each(this.cards, function(c){
            var hs = c.getDependencyHotSpot();
            items.push({
                type: 'rect',
                width: hs.width,
                height: hs.height,
                x: hs.x,
                y: hs.y + yOffset ,
                fill: 'transparent',
                border: 'transparent',
                style: {
                  cursor: 'pointer'
                },
                listeners: {
                   click: function(e,t){
                      c.fireEvent('showdependency',c);
                   },
                   scope: c
                }
            });

            var hs = c.getDescriptionHotSpot();
            items.push({
                type: 'rect',
                width: hs.width,
                height: hs.height,
                x: hs.x,
                y: hs.y + yOffset ,
                fill: 'transparent',
                border: 'transparent',
                style: {
                  cursor: 'pointer'
                },
                listeners: {
                  mouseover: function(e,t){
                     c.fireEvent('fieldClick','Description');
                  },
                  mouseout: function(e,t){
                     c.fireEvent('mouseout', c);
                  },
                   scope: c
                }
            });
            var hs = c.getItemHotSpot();
            items.push({
                type: 'rect',
                width: hs.width,
                height: hs.height,
                x: hs.x,
                y: hs.y + yOffset ,
                fill: 'transparent',
                border: 'transparent',
                style: {
                  cursor: 'pointer'
                },
                listeners: {
                   click: function(e,t){
                      c.fireEvent('fieldclick','Item');
                   },
                   scope: c
                }
            });

          });

          return Ext.create('Ext.draw.Component', {
              style: Ext.String.format('position:relative; top:{0}px; left:{1}px;', -board.getHeight(),-boardX),
              itemId: 'childDependencies',
              id: 'dep',
              viewBox: false,
              height: board.getHeight(),
              width: board.getWidth(),
              items: items
          });

      }

});
