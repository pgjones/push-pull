var push_pull = push_pull || {}; // Global namespace

/// Create a histogram with a JQuery canvas object and a table object
push_pull.Histogram = function(canvas, table)
{
  this._canvas = canvas;
  this._table = table;
  this._context = canvas[0].getContext("2d");
  this._selected = -1;
  this._bins = [{"text" : "10 mins", "time" : 1000 * 60 * 10, "count" : 0, "colour" : "Lime"},
                {"text" : "1 hour",  "time" : 1000 * 60 * 60, "count" : 0, "colour" : "LimeGreen"},
                {"text" : "2 hours", "time" : 1000 * 60 * 60 * 2, "count" : 0, "colour" : "Green"},
                {"text" : "5 hours", "time" : 1000 * 60 * 60 * 5, "count" : 0, "colour" : "YellowGreen"},
                {"text" : "1 day",   "time" : 1000 * 60 * 60 * 24, "count" : 0, "colour" : "Yellow"},
                {"text" : "1 week",  "time" : 1000 * 60 * 60 * 24 * 7, "count" : 0, "colour" : "Orange"},
                {"text" : "1 month", "time" : 1000 * 60 * 60 * 24 * 7 * 4, "count" : 0, "colour" : "OrangeRed"},
                {"text" : "3 months","time" : 1000 * 60 * 60 * 24 * 7 * 12, "count" : 0, "colour" : "Red"},
                {"text" : "1 year",  "time" : 1000 * 60 * 60 * 24 * 7 * 52, "count" : 0, "colour" : "Maroon"}];
  this._height = this._context.canvas.height - 20;
  this._width = this._context.canvas.width - 20;
  this._bin_width = Math.floor(this._width / this._bins.length);

  this._canvas.on('mousemove', function(event) {this.mouse_move(event);}.bind(this));
  this._canvas.on('mouseleave', function() {this._selected = -1;this.draw();}.bind(this));
  this._canvas.on('mouseup', function(event) {this.mouse_click(event);}.bind(this));

  /// Update on mouse movement
  this.mouse_move = function(event)
  {
    this.pick(event);
  }
  /// Update on a click
  this.mouse_click = function(event)
  {
    this.pick(event);
    if(this._selected != -1)
    {
      var lower_time = 0.0;
      if(this._selected > 0)
        lower_time = this._bins[this._selected - 1].time
      push_pull.change_selection(push_pull.STypes.Lifespan, lower_time, this._bins[this._selected].time);
    }
  }
  /// This picks the sector the mouse is over (if any)
  this.pick = function(event)
  {
    var x = (event.pageX - this._canvas.offset().left) / this._canvas.width() * this._context.canvas.width;
    var y = (event.pageY - this._canvas.offset().top) / this._canvas.height() * this._context.canvas.height;
    if(y > this._height || x < 20)
    {
      this._selected = -1;
      return;
    }
    else
      this._selected = Math.floor((x - 20) / this._bin_width);
    
    this.draw();
  }

  /// Update with data. data should be an array of lifespans
  this.update = function(data)
  {
    // Set the bin counts to zero
    for(var ibin = 0; ibin < this._bins.length; ibin++)
      this._bins[ibin].count = 0;
    // Now convert the array into bin counts
    for(var idata = 0; idata < data.length; idata++)
    {
      var lifespan = data[idata];
      for(var ibin = 0; ibin < this._bins.length; ibin++)
      {
        if(lifespan < this._bins[ibin].time)
        {
          this._bins[ibin].count++;
          break;
        }
      }
    }
    this._max = 0;
    for(var ibin = 0; ibin < this._bins.length; ibin++)
      this._max = Math.max(this._max, this._bins[ibin].count);
    // Now update the table
    this._table.empty();
    var select_generator = function(value, value2) { return function(event) {push_pull.change_selection(push_pull.STypes.Lifespan, value, value2);} };
    for(var ibin = 0; ibin < this._bins.length; ibin++)
    {
      var lower_time = 0.0;
      if(ibin > 0)
        lower_time = this._bins[ibin - 1].time
      var row = $('<tr style="cursor:pointer;"><td>' + this._bins[ibin].text + '</td><td>' + this._bins[ibin].count + '</td></tr>');
      row.on('click', select_generator(lower_time, this._bins[ibin].time));
      this._table.append(row);
    }
    this.draw();
  }

  /// Draw the data
  this.draw = function()
  {
    this._context.save();
    this._context.clearRect(0, 0, this._context.canvas.width, this._context.canvas.height);
    for(var ibin = 0; ibin < this._bins.length; ibin++)
    {
      if(this._selected == ibin)
        this._context.fillStyle = "Cyan";
      else
        this._context.fillStyle = this._bins[ibin].colour;

      var bar_top = (this._max - this._bins[ibin].count) / this._max * this._height;
      this._context.fillRect(20 + ibin * this._bin_width, bar_top, this._bin_width, this._height - bar_top);
      this._context.fillStyle = "black";
      this._context.fillText(this._bins[ibin].text, 20 + ibin * this._bin_width, this._context.canvas.height - 5, this._bin_width);
    }
    // Now y axis
    this._context.fillStyle = "black";
    this._context.fillText("0", 0, this._height, 20);
    this._context.fillText(this._max, 0, 10, 20);
    this._context.restore();
  }
  this.update([]);
}
