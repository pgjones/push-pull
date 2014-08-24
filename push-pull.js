var push_pull = push_pull || {}; // Global namespace
// Now the globals
push_pull.gh_objects = []; // JSON github objects
push_pull.images = {}; // Global image collection
// Global modes, pull request or issues
push_pull.MTypes = Object.freeze({PullRequest : 1, Issue : 2});
push_pull.mode = push_pull.MTypes.PullRequest;
// Selection types i.e. select on nothing, lifespan etc... 
push_pull.STypes = Object.freeze({None : 0, Lifespan : 1, Created : 2, Assigned : 3}); 
// Selection method, default is to select everything (no selection)
push_pull.select = function(gh_object) {return true;};

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
  if(type == push_pull.STypes.None)
  {
    push_pull.select = function(gh_object) {return true;};
  }
  else if(type == push_pull.STypes.Lifespan)
  {
    push_pull.select = function(gh_object) {if(push_pull.lifespan(gh_object) < value2 && push_pull.lifespan(gh_object) > value) return true; return false;};
  }
  else if(type == push_pull.STypes.Created)
  {
    push_pull.select = function(gh_object) {if(gh_object.user !== null && gh_object.user.login == value) return true; return false;};
  }
  else if(type == push_pull.STypes.Assigned && push_pull.mode == push_pull.MTypes.PullRequest)
  {
    push_pull.select = function(gh_object) {if(gh_object.merged_by !== null && gh_object.merged_by.login == value) return true;  return false;};
  }
  else if(type == push_pull.STypes.Assigned && push_pull.mode == push_pull.MTypes.Issue)
  {
    push_pull.select = function(gh_object) {if(gh_object.assignee !== null && gh_object.assignee.login == value) return true;  return false;};
  }
  push_pull.update();
};

/// Helper method, gets the lifespan of a gh object
push_pull.lifespan = function(gh_object)
{
  var created = new Date(gh_object.created_at);
  var closed = new Date(gh_object.closed_at);
  return closed - created;
};

/// This updates everything on a change in the data
push_pull.update = function()
{
  push_pull.update_lifespan();
  push_pull.update_created();
  push_pull.update_assigned();
  push_pull.update_plots();
};

/// This updates the lifespan histogram
push_pull.update_lifespan = function()
{
  // First loop over gh objects and add the lifespans to a list
  var lifespans = [];
  for(var iobject = 0; iobject < push_pull.gh_objects.length; iobject++)
  {
    if(push_pull.select(push_pull.gh_objects[iobject])) // Is selected?
      lifespans.push(push_pull.lifespan(push_pull.gh_objects[iobject]));
  }
  push_pull.lifespan_histogram.update(lifespans);
};

/// This updates the created-by pie chart
push_pull.update_created = function()
{
  var contributors = {};
  for(var iobject = 0; iobject < push_pull.gh_objects.length; iobject++)
  {
    // Has a user (can not exist strangely) and Is selected?
    if(push_pull.gh_objects[iobject].user === null || !push_pull.select(push_pull.gh_objects[iobject]))
      continue;
    var user = push_pull.gh_objects[iobject].user.login;
    if(contributors[user] === undefined)
      contributors[user] = {"avatar" : push_pull.gh_objects[iobject].user.avatar_url, "count" : 1};
    else
      contributors[user].count += 1;
  }
  var sorted_contributors = push_pull.sort_contributors(contributors);
  push_pull.created_pie.update(sorted_contributors);
};

/// This updates the assigned data and draws a pie chart
push_pull.update_assigned = function()
{
  var contributors = {};
  for(var iobject = 0; iobject < push_pull.gh_objects.length; iobject++)
  {
    // Is selected?
    if(!push_pull.select(push_pull.gh_objects[iobject]))
      continue;
    var user = null;
    var avatar = null;
    if(push_pull.mode == push_pull.MTypes.Issue && push_pull.gh_objects[iobject].assignee !== null)
    {
      user = push_pull.gh_objects[iobject].assignee.login;
      avatar = push_pull.gh_objects[iobject].assignee.avatar_url;
    }
    else if(push_pull.mode == push_pull.MTypes.PullRequest && push_pull.gh_objects[iobject].merged_by !== null)
    {
      user = push_pull.gh_objects[iobject].merged_by.login;
      avatar = push_pull.gh_objects[iobject].merged_by.avatar_url;
    }
    else 
      continue; // No useful data (not merged or assigned)
    if(avatar === null)
      console.log(push_pull.gh_objects[iobject]);
    if(contributors[user] === undefined)
      contributors[user] = {"avatar" : avatar, "count" : 1};
    else
      contributors[user].count += 1;
  }
  var sorted_contributors = push_pull.sort_contributors(contributors);
  push_pull.assigned_pie.update(sorted_contributors);
};

/// This sorts the contributors data and also sums the count. 
/// The sort orders in count, highest to lowest
push_pull.sort_contributors = function(contributors)
{
  var sorted_contributors = [];
  for(var contributor in contributors)
  {
    sorted_contributors.push([contributors[contributor].count, contributor, contributors[contributor].avatar]);
  }
  sorted_contributors.sort(function(a, b) {return b[0] - a[0];});
  return sorted_contributors;
};

/// This function updates the plots
push_pull.update_plots = function()
{
  var lifetime_comments = [];
  var lifetime_number = [];
  var lifetime_commits = [];
  var lifetime_changes = [];
  // For each github object add to each list an array of the [x, y] coordinate. 
  // y is always lifetime
  for(var iobject = 0; iobject < push_pull.gh_objects.length; iobject++)
  {
    // Is selected?
    if(!push_pull.select(push_pull.gh_objects[iobject]))
      continue;
    var lifespan = push_pull.lifespan(push_pull.gh_objects[iobject]);
    lifetime_comments.push([push_pull.gh_objects[iobject].comments, lifespan]);
    lifetime_number.push([push_pull.gh_objects[iobject].number, lifespan]);
    if(push_pull.gh_objects[iobject].commits)
      lifetime_commits.push([push_pull.gh_objects[iobject].commits, lifespan]);
    if(push_pull.gh_objects[iobject].additions && push_pull.gh_objects[iobject].deletions)
      lifetime_changes.push([push_pull.gh_objects[iobject].additions + push_pull.gh_objects[iobject].deletions, lifespan]);
  }
  push_pull.lifetime_comments.update(lifetime_comments);
  push_pull.lifetime_number.update(lifetime_number);
  push_pull.lifetime_commits.update(lifetime_commits);
  push_pull.lifetime_changes.update(lifetime_changes);
};

/// This function processes a list of pull requests/issues and requests the full
/// details for each pull request/issue. The full details are then saved in the
/// global push_pull.gh_objects list
push_pull.process = function(json)
{
  for(var iobject = 0; iobject < json.length; iobject++)
  {
    // Updates on each response if the number of objects is less than 100
    $.getJSON(json[iobject].url, push_pull.process_object).error(push_pull.process_error);
  }
  // Update on completion
  push_pull.update();
};

/// Process a single object as returned by github
push_pull.process_object = function(json)
{
  push_pull.gh_objects.push(json);
  if(push_pull.gh_objects.length < 100)
    push_pull.update();
};

/// This function deals with an error and alerts the user
push_pull.process_error = function(error)
{
  $('#loader').hide();
  $('#error').show();
  $.getJSON("https://api.github.com/rate_limit", function(result) {$('.requests').text(result.resources.core.remaining);});
  $('#error_message').text(error.status + " " + error.statusText);
  /// Update with whatever has been retrieved
  push_pull.update();
};

/// Get all the objects by type specified, by asking github for them in blocks 
/// of 100. 100 is the maximum that can be requested at any one time.
push_pull.get_github_objects = function(type)
{
  // Reset the existing list and selection criteria
  push_pull.gh_objects = [];
  push_pull.change_selection(push_pull.STypes.None, null);
  var username = $('#username').val();
  var repository = $('#repository').val();
  get_json = function(username, repository, page) 
  { 
    // Note only closed objects are considered
    $.getJSON("https://api.github.com/repos/" + username + "/" + repository + "/" + type + "?state=closed&page=" + page + "&per_page=100", 
              function(json)
              {
                push_pull.process(json); 
                // As long as some objects were returned ask for more
                if(json.length > 0) get_json(username, repository, page + 1);
                else
                  {
                    $('#success').show();
                    $('#loader').hide();
                    $.getJSON("https://api.github.com/rate_limit", function(result) {$('.requests').text(result.resources.core.remaining);});
                    setTimeout(function(){$('#success').fadeOut();}, 1500);
                  }
              }).error(push_pull.process_error);
    push_pull.update();
  };
  get_json(username, repository, 1);
};

/// UI control below

/// Get all the pull requests, by asking github for them in blocks of 100
/// 100 is the maximum that can be requested at any one time.
$('#get_pulls').on('click', function()
{
  $('#loader').show();
  push_pull.mode = push_pull.MTypes.PullRequest;
  push_pull.get_github_objects("pulls");
  $('#controls').fadeOut();
});

/// Get all the issues, by asking github for them in blocks of 100
/// 100 is the maximum that can be requested at any one time.
$('#get_issues').on('click', function()
{
  $('#loader').show();
  push_pull.mode = push_pull.MTypes.Issue;
  push_pull.get_github_objects("issues");
  $('#controls').fadeOut();
});

/// Set the specified token to the ajax header
$('#set_token').on('click', function()
{
  $.ajaxSetup({
    headers: { 'Authorization': "token " + $('#token').val() }
  });
});

$('#reset_selection').on('click', function() {push_pull.change_selection(push_pull.STypes.None, null);});
$('#show_controls').on('click', function() {$('#controls').fadeIn();});
$('#hide_controls').on('click', function() {$('#controls').fadeOut();});
$('#hide_error').on('click', function() {$('#error').fadeOut();});
$('#hide_graph').on('click', function() {$('#large_graph').fadeOut();});
$('#help').on('click', function() {window.location.href = "#help";});
$('#controls_help').on('click', function() {window.location.href = "#help"; $('#controls').hide();});
/// This positions the popups in the centre of the window
push_pull.resize = function()
{
  $('#success').hide();
  $('#success').css({"top" : ($(window).height() - $('#success').outerHeight()) / 2 + "px",
                     "left" : ($(window).width() - $('#success').outerWidth()) / 2 + "px"});
  $('#error').hide();
  $('#error').css({"top" : ($(window).height() - $('#error').outerHeight()) / 2 + "px",
                   "left" : ($(window).width() - $('#error').outerWidth()) / 2 + "px"});
  $('#controls').css({"top" : ($(window).height() - $('#controls').outerHeight()) / 10 + "px",
                      "left" : ($(window).width() - $('#controls').outerWidth()) / 2 + "px"});
  push_pull.large_graph.resize();
};
/// Resize things on load or resize of the window
$(window).resize(push_pull.resize());
$(window).load(function() 
{
  $('#large_graph').hide(); 
  $('#loader').hide();
  push_pull.resize(); 
});
