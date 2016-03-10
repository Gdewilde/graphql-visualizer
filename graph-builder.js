var _ = require('lodash');

var introspection = require('./introspection.json');
var types = introspection.result.data.__schema.types;


// Usage: node erd.js | dot -Kdot -Tpdf > erd.pdf


function processType(item, entities) {
  var type = _.findWhere(types, {name: item});

  var fields = _.map(type.fields, function(field) {
    var obj = {};
    obj.name = field.name;

    if(field.type.ofType) {
      obj.type = field.type.ofType.name;
      obj.isObjectType = field.type.ofType.kind == 'OBJECT';
      obj.isList = field.type.kind == 'LIST';
    }
    else {
      obj.type = field.type.name;
      obj.isObjectType = field.type.kind == 'OBJECT';
    }

    return obj;
  });

  entities[type.name] = {
    name: type.name,
    fields: fields
  };

  var linkeditems = _.chain(fields)
    .filter('isObjectType')
    .pluck('type')
    .uniq()
    .value();
  return linkeditems;
}




// start with query, walk, build links
var queue = [introspection.result.data.__schema.queryType.name];
var entities = {};

while(queue.length > 0) {
  var item = queue.shift();

  // if item has already been processed
  if(entities[item]) continue;

  // process item
  queue = queue.concat(processType(item, entities));
}


// console.log(JSON.stringify(entities, null, 2))
// console.log('\n')


var dotfile = 'digraph au_graphql_erd {\n'+
  'graph [\n'+
  '  rankdir = "LR"\n'+
  '];\n'+
  'node [\n'+
  '  fontsize = "16"\n'+
  '  shape = "ellipse"\n'+
  '];\n'+
  'edge [\n'+
  '];\n';

// nodes
dotfile += _.map(entities, function(v, k) {
  var rows = _.map(v.fields, function(v) {
    return v.name+': '+(v.isList ? '['+v.type+']' : v.type);
  });
  rows.unshift(v.name);

  return v.name+' [label="'+rows.join(' | ')+'" shape="record"];'
}).join('\n');

dotfile += '\n\n';

// edges
dotfile += _.chain(entities)
  .reduce(function(a, v) {
    _.each(v.fields, function(f) {
      if(!f.isObjectType) return;

      a.push(v.name+' -> '+f.type);
    })

    return a;
  }, [])
  .uniq()
  .value()
  .join('\n');


dotfile += '\n}';







console.log(dotfile);
