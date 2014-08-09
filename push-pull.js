var push_pull = push_pull || {}; // Global namespace
push_pull.gh_objects = []; // JSON github objects
push_pull.images = {} // Global image collection
push_pull.STypes = Object.freeze({None : 0, Lifespan : 1, Created : 2, Assigned : 3});
push_pull.select = function(gh_object) {return true;} // by default select everything

/// Global plots
push_pull.lifespan_histogram = new push_pull.Histogram($('#lifespan'), $('#lifespan_list'));
push_pull.created_pie = new push_pull.PieChart($('#created'), $('#created_list'), push_pull.STypes.Created);
push_pull.assigned_pie = new push_pull.PieChart($('#assigned'), $('#assigned_list'), push_pull.STypes.Assigned);
push_pull.lifetime_comments = new push_pull.Graph($('#lifetime_comments'), "comments");
push_pull.lifetime_number = new push_pull.Graph($('#lifetime_number'), "# number");
push_pull.lifetime_commits = new push_pull.Graph($('#lifetime_commits'), "commits");
push_pull.lifetime_changes = new push_pull.Graph($('#lifetime_changes'), "changes");

/// Change the selection criteria, the content of the value paramters depend on 
/// the type
push_pull.change_selection = function(type, value, value2)
{
  var label = $('#select_label');
  if(type == push_pull.STypes.None)
  {
    push_pull.select = function(gh_object) {return true;}
    label.text('No selection');
  }
  else if(type == push_pull.STypes.Lifespan)
  {
    push_pull.select = function(gh_object) {if(push_pull.lifespan(gh_object) < value2 && push_pull.lifespan(gh_object) > value) return true; return false;}
    label.text('Selecting lifespans <' + value);
  }
  else if(type == push_pull.STypes.Created)
  {
    push_pull.select = function(gh_object) {if(gh_object.user != null && gh_object.user.login == value) return true; return false;}
    label.text('Selecting created by ' + value);
  }
  else if(type == push_pull.STypes.Assigned)
  {
    push_pull.select = function(gh_object) {if(gh_object.assignee != null && gh_object.assignee.login == value) return true;  return false;}
    label.text('Selecting assigned to ' + value);
  }
  push_pull.update();
  push_pull.update_plots();
}

/// Helper method, gets the lifespan of a gh object
push_pull.lifespan = function(gh_object)
{
  var created = new Date(gh_object.created_at);
  var closed = new Date(gh_object.closed_at);
  return closed - created;
}

/// This updates everything on a change in the data
push_pull.update = function()
{
  push_pull.update_lifespan();
  push_pull.update_created();
  push_pull.update_assigned();
}

push_pull.update_lifespan = function()
{
  // First loop over gh objects and get the lifespans
  var lifespans = [];
  for(var iobject = 0; iobject < push_pull.gh_objects.length; iobject++)
  {
    if(push_pull.select(push_pull.gh_objects[iobject]))
      lifespans.push(push_pull.lifespan(push_pull.gh_objects[iobject]));
  }
  push_pull.lifespan_histogram.update(lifespans);
}

/// This updates the created data and draws a pie chart
push_pull.update_created = function()
{
  var contributors = {};
  for(var iobject = 0; iobject < push_pull.gh_objects.length; iobject++)
  {
    if(push_pull.gh_objects[iobject].user == null || !push_pull.select(push_pull.gh_objects[iobject]))
      continue;
    var user = push_pull.gh_objects[iobject].user.login;
    if(contributors[user] === undefined)
      contributors[user] = {"avatar" : push_pull.gh_objects[iobject].user.avatar_url, "count" : 1};
    else
      contributors[user].count += 1;
  }
  var sorted_contributors = push_pull.sort_contributors(contributors);
  push_pull.created_pie.update(sorted_contributors);
}

/// This updates the assigned data and draws a pie chart
push_pull.update_assigned = function()
{
  var contributors = {};
  for(var iobject = 0; iobject < push_pull.gh_objects.length; iobject++)
  {
    if(push_pull.gh_objects[iobject].assignee == null || !push_pull.select(push_pull.gh_objects[iobject]))
      continue;
    var user = push_pull.gh_objects[iobject].assignee.login;
    if(contributors[user] === undefined)
      contributors[user] = {"avatar" : push_pull.gh_objects[iobject].assignee.avatar_url, "count" : 1};
    else
      contributors[user].count += 1;
  }
  var sorted_contributors = push_pull.sort_contributors(contributors);
  push_pull.assigned_pie.update(sorted_contributors);
}

/// This sorts the contributors data and also sums the count
push_pull.sort_contributors = function(contributors)
{
  var sorted_contributors = [];
  for(var contributor in contributors)
  {
    sorted_contributors.push([contributors[contributor].count, contributor, contributors[contributor].avatar]);
  }
  sorted_contributors.sort(function(a, b) {return b[0] - a[0]});
  return sorted_contributors;
}

/// This function updates the plots
push_pull.update_plots = function()
{
  var lifetime_comments = [];
  var lifetime_number = [];
  var lifetime_commits = [];
  var lifetime_changes = [];
  for(var iobject = 0; iobject < push_pull.gh_objects.length; iobject++)
  {
    if(!push_pull.select(push_pull.gh_objects[iobject]))
      continue;
    lifetime_comments.push([push_pull.gh_objects[iobject].comments, push_pull.lifespan(push_pull.gh_objects[iobject])]);
    lifetime_number.push([push_pull.gh_objects[iobject].number, push_pull.lifespan(push_pull.gh_objects[iobject])]);
    if(push_pull.gh_objects[iobject].commits)
      lifetime_commits.push([push_pull.gh_objects[iobject].commits, push_pull.lifespan(push_pull.gh_objects[iobject])]);
    if(push_pull.gh_objects[iobject].additions && push_pull.gh_objects[iobject].deletions)
      lifetime_changes.push([push_pull.gh_objects[iobject].additions + push_pull.gh_objects[iobject].deletions, push_pull.lifespan(push_pull.gh_objects[iobject])]);
  }
  push_pull.lifetime_comments.update(lifetime_comments);
  push_pull.lifetime_number.update(lifetime_number);
  push_pull.lifetime_commits.update(lifetime_commits);
  push_pull.lifetime_changes.update(lifetime_changes);
}

$('#get_details').on('click', function()
{
  var setter = function(iobject)
  {
    return function(json) 
    {
      push_pull.gh_objects[iobject].comments = json.comments;
      push_pull.gh_objects[iobject].number = json.number;
      if(json.commits)
        push_pull.gh_objects[iobject].commits = json.commits;
      if(json.additions)
        push_pull.gh_objects[iobject].additions = json.additions;
      if(json.deletions)
        push_pull.gh_objects[iobject].deletions = json.deletions;
      push_pull.update_plots();
    }
  }
  for(var iobject = 0; iobject < push_pull.gh_objects.length; iobject++)
  {
    $.getJSON(push_pull.gh_objects[iobject].url, setter(iobject));
  }
});

/// This function takes an array of closed pull request objects and fills the data arrays
push_pull.process = function(json)
{
  push_pull.gh_objects.push.apply(push_pull.gh_objects, json);
}

$('#get_pulls').on('click', function()
{
  push_pull.gh_objects = [];
  push_pull.change_selection(push_pull.STypes.None, null);
  var username = $('#username').val();
  var repository = $('#repository').val();
  get_json = function(username, repository, page) 
  { 
    $.getJSON("https://api.github.com/repos/" + username + "/" + repository + "/pulls\?state\=closed\&page\=" + page + "\&per_page\=100", 
              function(json) 
              {
                push_pull.process(json); 
                if(json.length > 0) get_json(username, repository, page + 1);
              });
    push_pull.update();
  }
  get_json(username, repository, 1);
});

$('#get_issues').on('click', function()
{
  push_pull.gh_objects = [];
  push_pull.change_selection(push_pull.STypes.None, null);
  var username = $('#username').val();
  var repository = $('#repository').val();
  get_json = function(username, repository, page) 
  { 
    $.getJSON("https://api.github.com/repos/" + username + "/" + repository + "/issues\?state\=closed\&page\=" + page + "\&per_page\=100", 
              function(json) 
              {
                push_pull.process(json); 
                if(json.length > 0) get_json(username, repository, page + 1);
              });
    push_pull.update();
  }
  get_json(username, repository, 1);
});

$('#set_token').on('click', function()
{
  $.ajaxSetup({
    headers: { 'Authorization': "token " + $('#token').val() }
  });
});

$('#reset_selection').on('click', function() {push_pull.change_selection(push_pull.STypes.None, null);});
