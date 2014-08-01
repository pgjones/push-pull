var push_pull = push_pull || {}; // Global namespace
push_pull.gh_objects = []; // JSON github objects
push_pull.images = {} // Global image collection
push_pull.colours = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"] // Colours by id

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
    lifespans.push(push_pull.lifespan(push_pull.gh_objects[iobject]));
  // Now specify the histogram bins
  var bins = {"<10 mins" : {"time" : 1000 * 60 * 10, "count" : 0},
              "<1 hour"  : {"time" : 1000 * 60 * 60, "count" : 0},
              "<2 hours" : {"time" : 1000 * 60 * 60 * 2, "count" : 0},
              "<5 hours" : {"time" : 1000 * 60 * 60 * 5, "count" : 0},
              "<1 day"   : {"time" : 1000 * 60 * 60 * 24, "count" : 0},
              "<1 week"  : {"time" : 1000 * 60 * 60 * 24 * 7, "count" : 0},
              "<1 month" : {"time" : 1000 * 60 * 60 * 24 * 7 * 4, "count" : 0},
              "<3 months" : {"time" : 1000 * 60 * 60 * 24 * 7 * 12, "count" : 0},
              "<1 year"  : {"time" : 1000 * 60 * 60 * 24 * 7 * 52, "count" : 0},}
  for(var ilifespan = 0; ilifespan < lifespans.length; ilifespan++)
  {
    var lifespan = lifespans[ilifespan];
    for(var bin in bins)
    {
      if(lifespan < bins[bin].time)
      {
        bins[bin].count++;
        break;
      }
    }
  }
  var bin_max = 0;
  for(var bin in bins)
  {
    bin_max = Math.max(bin_max, bins[bin].count);
  }

  var context = $('#lifespan')[0].getContext('2d');
  var histogram_height = context.canvas.height - 20;
  var histogram_width = context.canvas.width - 20;
  var bin_pixel_width = Math.floor(histogram_width / Object.keys(bins).length);
  context.save();
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  var ibin = 0;
  for(var bin in bins)
  {
    context.fillStyle = push_pull.colours[push_pull.colours.length - 1 - ibin % push_pull.colours.length];
    var bar_top = (bin_max - bins[bin].count) / bin_max * histogram_height;
    context.fillRect(20 + ibin * bin_pixel_width, bar_top, bin_pixel_width, histogram_height - bar_top);
    context.fillStyle = "black";
    context.fillText(bin, 20 + ibin * bin_pixel_width, context.canvas.height - 5, bin_pixel_width);
    ibin++;
  }
  // Now y axis
  context.fillStyle = "black";
  context.fillText("0", 0, histogram_height, 20);
  context.fillText(bin_max, 0, 10, 20);
  context.restore();
}

/// This updates the created data and draws a pie chart
push_pull.update_created = function()
{
  var contributors = {};
  for(var iobject = 0; iobject < push_pull.gh_objects.length; iobject++)
  {
    var user = push_pull.gh_objects[iobject].user.login;
    if(contributors[user] === undefined)
      contributors[user] = {"avatar" : push_pull.gh_objects[iobject].user.avatar_url, "count" : 1};
    else
      contributors[user].count += 1;
  }
  var sorted_contributors = push_pull.sort_contributors(contributors);
  push_pull.draw_pie($('#created')[0].getContext('2d'), sorted_contributors);
}

/// This updates the assigned data and draws a pie chart
push_pull.update_assigned = function()
{
  var contributors = {};
  for(var iobject = 0; iobject < push_pull.gh_objects.length; iobject++)
  {
    if(push_pull.gh_objects[iobject].assignee == null) // Not everything is assigned
      continue;
    var user = push_pull.gh_objects[iobject].assignee.login;
    if(contributors[user] === undefined)
      contributors[user] = {"avatar" : push_pull.gh_objects[iobject].assignee.avatar_url, "count" : 1};
    else
      contributors[user].count += 1;
  }
  var sorted_contributors = push_pull.sort_contributors(contributors);
  push_pull.draw_pie($('#assigned')[0].getContext('2d'), sorted_contributors);
}

/// This sorts the contributors data and also sums the count
push_pull.sort_contributors = function(contributors)
{
  var sorted_contributors = [];
  for(var contributor in contributors)
  {
    sorted_contributors.push([contributors[contributor].avatar, contributors[contributor].count]);
  }
  sorted_contributors.sort(function(a, b) {return b[1] - a[1]});
  return sorted_contributors;
}

/// This draws a pie chart for contributors
push_pull.draw_pie = function(context, contributors)
{
  var total = 0;
  for(var icontributor = 0; icontributor < contributors.length; icontributor++) 
    total += contributors[icontributor][1];

  var center = [context.canvas.width / 2, context.canvas.height / 2];
  var radius = context.canvas.width / 2 - 40;
  context.save();
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  var start_angle = 0.0;
  for(var icontributor = 0; icontributor < Math.min(contributors.length, push_pull.colours.length); icontributor++)
  {
    var percentage = contributors[icontributor][1] / total;
    context.fillStyle = push_pull.colours[icontributor];
    context.beginPath();
    context.moveTo(center[0], center[1]);
    context.arc(center[0], center[1], radius, start_angle, start_angle + percentage * 2.0 * Math.PI);
    context.lineTo(center[0], center[1]);
    context.closePath();
    context.fill();
    // Now the image
    var image = push_pull.images[contributors[icontributor][0]];
    if(image === undefined)
      {
        image = new Image();
        image.src = contributors[icontributor][0];
        push_pull.images[contributors[icontributor][0]] = image;
        image.onload = function() {push_pull.update();}
      }
    var image_angle = start_angle + percentage * Math.PI;
    context.drawImage(image, 0, 0, image.width, image.height, 
                      center[0] + (radius + 15) * Math.cos(image_angle) - 10, 
                      center[1] + (radius + 15) * Math.sin(image_angle) - 10, 20, 20);
    start_angle += percentage * 2.0 * Math.PI;
  }
  // Now whatever is left
  context.fillStyle = "black";
  context.beginPath();
  context.moveTo(center[0], center[1]);
  context.arc(center[0], center[1], radius, start_angle, 2.0 * Math.PI);
  start_angle += percentage * 2.0 * Math.PI;
  context.lineTo(center[0], center[1]);
  context.closePath();
  context.fill();
  context.restore();
}

/// This function takes an array of closed pull request objects and fills the data arrays
push_pull.process = function(json)
{
  push_pull.gh_objects.push.apply(push_pull.gh_objects, json);
}


$('#get_pulls').on('click', function()
{
  push_pull.gh_objects = [];
  var username = $('#username').val();
  var repository = $('#repository').val();
  get_json = function(username, repository, page) 
  { 
    if(page < 2) // Temp safety messure
      $.getJSON("https://api.github.com/repos/" + username + "/" + repository + "/pulls\?state\=closed\&page\=" + page + "\&per_page\=100", 
                function(json) {push_pull.process(json); get_json(username, repository, page + 1)}) // As long as the above succeeds it will try again.
      .fail(function() {push_pull.update();}); // Update everything on fail
    else
      push_pull.update();
  }
  get_json(username, repository, 1);
});

$('#get_issues').on('click', function()
{
  push_pull.gh_objects = [];
  var username = $('#username').val();
  var repository = $('#repository').val();
  get_json = function(username, repository, page) 
  { 
    if(page < 2) // Temp safety messure
      $.getJSON("https://api.github.com/repos/" + username + "/" + repository + "/issues\?state\=closed\&page\=" + page + "\&per_page\=100", 
                function(json) {push_pull.process(json); get_json(username, repository, page + 1)}) // As long as the above succeeds it will try again.
      .fail(function() {push_pull.update();}); // Update everything on fail
    else
      push_pull.update();
  }
  get_json(username, repository, 1);
});

/*$.ajaxSetup({
    headers: { 'Authorization': "token abcd" }
});*/
/*$.ajax({type: 'GET', 
        url: 'https://api.github.com/repos/snoplus/snoing/pulls\?state\=closed',
        dataType:'json',
        success: process,
        timeout: 10000});*/
$.getJSON("https://api.github.com/rate_limit", function(json){console.log(json.rate.remaining, new Date(json.rate.reset * 1000));});
