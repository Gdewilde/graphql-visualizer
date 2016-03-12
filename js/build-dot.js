var buildDot = (function(_) {

  // process a graphql type object
  // returns simplified version of the type
  function processType(item, entities, types) {
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

  function pathDepth(path) {
    return (path.match(/\["\w+"\]/g) || []).length
  }

  // walks the object in level-order
  // invokes iter at each node
  // if iter returns truthy, breaks & returns the value
  // assumes no cycles
  function walkBFS(obj, iter) {
    var q = _.map(_.keys(obj), function(k) { return {key: k, path: '["'+k+'"]'}; });
    var current;
    var currentNode;
    var retval;
    while(q.length) {
      current = q.shift();
      currentNode = _.get(obj, current.path);
      retval = iter(currentNode, current.key, current.path);
      if(retval) return retval;

      if(_.isPlainObject(currentNode) || _.isArray(currentNode)) {
        _.each(currentNode, function(v, k) { q.push({key: k, path: current.path+'["'+k+'"]'}); });
      }
    }
  }



  return function(schema) {
    if(!_.isPlainObject(schema)) throw new Error('Must be plain object');

    // find entry points
    var rootPath = walkBFS(schema, function(v, k, p) {  if(k == '__schema') return p; });
    if(!rootPath) throw new Error('Cannot find "__schema" object');
    var root = _.get(schema, rootPath);

    // build the graph
    var q = [];
    if(root.queryType) q.push(root.queryType.name);
    // if(root.mutationType) q.push(root.mutationType.name);

    // walk the graph & build up nodes & edges
    var current;
    var entities = {};
    while(q.length) {
      current = q.shift();

      // if item has already been processed
      if(entities[current]) continue;

      // process item
      q = q.concat(processType(current, entities, root.types));
    }

    // build the dot
    var dotfile = 'digraph erd {\n'+
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

    return dotfile;
  }



})(_)
