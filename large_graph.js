var push_pull = push_pull || {}; // Global namespace

/// Create a large graph with a JQuery canvas object and a name for the x axis
/// and the data to draw
push_pull.large_graph = new function()
{
  var MMode = Object.freeze({Up : 0, Down : 1});
  this._canvas = $('#large_graph_canvas');
  this._context = this._canvas[0].getContext("2d");
  this._data = [[0, 0], [1, 1]];
  var small_size = Math.min(this._context.canvas.width, this._context.canvas.height);
  this._axis_size = small_size / 10;
  this._font_size = this._axis_size / 8;
  this._height = this._context.canvas.height - this._axis_size;
  this._width = this._context.canvas.width - this._axis_size;
  this._x_name = "";
  this._mode = MMode.Up;
  this._start = [-1, -1];
  this._current = [-1, -1];
  this._x = [0.0, 1.0];
  this._y = [0.0, 1.0];

  /// On click to select a new axis range
  this._canvas.on('mousedown', function(event){this.mouse_down(event);}.bind(this));
  this._canvas.on('mouseup', function(event) {this.mouse_up(event);}.bind(this));
  this._canvas.on('mousemove', function(event) {this.mouse_move(event);}.bind(this));
  this._canvas.on('mouseenter', function(event) {if(event.which === 0) this._mode = MMode.Up; this.draw();}.bind(this));
  this._canvas.on('contextmenu', function(event) {return false;});

  /// On mouse down start selecting a graph area
  this.mouse_down = function(event)
  {
    var x = (event.pageX - this._canvas.offset().left) / this._canvas.width() * this._context.canvas.width;
    var y = (event.pageY - this._canvas.offset().top) / this._canvas.height() * this._context.canvas.height;
    x = Math.max(Math.max(x, this._axis_size), 0);
    y = Math.max(Math.min(y, this._height), 0);
    this._start = [x, y];
    this._mode = MMode.Down;
  };
  /// Called on movement
  this.mouse_move = function(event)
  {
    var x = (event.pageX - this._canvas.offset().left) / this._canvas.width() * this._context.canvas.width;
    var y = (event.pageY - this._canvas.offset().top) / this._canvas.height() * this._context.canvas.height;
    x = Math.max(Math.max(x, this._axis_size), 0);
    y = Math.max(Math.min(y, this._height), 0);
    this._current = [x, y];
    this.draw();
  };

  /// On mouse up zoom/reselect the graph area
  this.mouse_up = function(event)
  {
    if(this._mode == MMode.Down)
    {
      var x = (event.pageX - this._canvas.offset().left) / this._canvas.width() * this._context.canvas.width;
      var y = (event.pageY - this._canvas.offset().top) / this._canvas.height() * this._context.canvas.height;
      if(x != this._start[0] && y != this._start[1])
      {
        x = Math.max(Math.max(x, this._axis_size), 0);
        y = Math.max(Math.min(y, this._height), 0);
        this._x = [((this._start[0] - this._axis_size) / this._width) * (this._x[1] - this._x[0]) + this._x[0],
                   ((x - this._axis_size) / this._width) * (this._x[1] - this._x[0]) + this._x[0]];
        this._y = [((this._height - this._start[1]) / this._height) * (this._y[1] - this._y[0]) + this._y[0],
                   ((this._height - y) / this._height) * (this._y[1] - this._y[0]) + this._y[0]];
        this._x.sort(function(a, b){return a-b;});
        this._y.sort(function(a, b){return a-b;});
        this.draw();
      }
    }
    if(event.which != 1) // Non left click zooms out
    {
      this.reset();
      this.draw();
    }
    this._mode = MMode.Up;
  };

  /// Show the large graph panel drawn with new data
  this.show = function(data, name)
  {
    this._data = data;
    this._x_name = name;
    this._mode = MMode.Up;
    this._start_select = [-1, -1];
    this.resize();
    $('#large_graph_title').text("Lifetime versus " + name);
    $('#large_graph').fadeIn();
    this.reset();
    this.draw();
  };
  
  /// Resize the large graph panel
  this.resize = function()
  {
    $('#large_graph').css({"top" : "40px",
                           "left" : "40px",
                           "width" : ($(window).width() - 80.0) + "px",
                           "height" : ($(window).height() - 80.0) + "px",});
    this._context.canvas.width = $(window).width() - 140.0;
    this._context.canvas.height = $(window).height() - 160.0;
    var small_size = Math.min(this._context.canvas.width, this._context.canvas.height);
    this._axis_size = small_size / 10;
    this._font_size = this._axis_size / 4;
    this._height = this._context.canvas.height - this._axis_size;
    this._width = this._context.canvas.width - this._axis_size;
  };

  /// Reset the scaling
  this.reset = function()
  {
    // Sort in y and get y range
    this._data.sort(function(a, b) {return a[1] - b[1];});
    this._y = [this._data[0][1], 1.1 * this._data[this._data.length - 1][1]];
    // Sort in x and get x domain
    this._data.sort(function(a, b) {return a[0] - b[0];});
    this._x = [this._data[0][0], 1.1 * this._data[this._data.length - 1][0]];
    // Set x/y minimums to 0 if close (<10)
    if(this._y[0] < 10)
      this._y[0] = 0.0;
    if(this._x[0] < 10)
      this._x[0] = 0.0;
  };

  /// Draw the data
  this.draw = function()
  {
    this._context.save();
    this._context.font = this._font_size + "pt sans-serif";
    this._context.clearRect(0, 0, this._context.canvas.width, this._context.canvas.height);
    // xscale * x = pixel coordinate
    var xscale = this._width / (this._x[1] - this._x[0]);
    // yscal * y = pixel coordinate
    var yscale = this._height / (this._y[1] - this._y[0]);
    var range = this._y[1] - this._y[0];
    for(var ipoint = 0; ipoint < this._data.length; ipoint++)
    {
      this._context.fillStyle = "black";
      if(this._data[ipoint][0] < this._x[0] || this._data[ipoint][0] > this._x[1])
        continue;
      if(this._data[ipoint][1] < this._y[0] || this._data[ipoint][1] > this._y[1])
        continue;
      var x = this._data[ipoint][0] - this._x[0];
      // Fill a + for each point, remember canvas coordinates are from 
      // top, left not bottom, left as in graphs
      this._context.fillRect(this._axis_size + xscale * x + 1, (this._y[1] - this._data[ipoint][1]) * yscale - 4, 2, 4);
      this._context.fillRect(this._axis_size + xscale * x, (this._y[1] - this._data[ipoint][1]) * yscale - 3, 4, 2);
    }
    // Draw x, y axis lines
    this._context.strokeStyle = "Blue";
    this._context.beginPath();
    this._context.moveTo(this._axis_size, 0);
    this._context.lineTo(this._axis_size, this._height + 1);
    this._context.lineTo(this._axis_size + this._width, this._height + 1);
    this._context.stroke();
    this._context.closePath();
    // Now the x,y axis labels
    this._context.fillStyle = "black";
    this._context.fillText(this._y[0].toExponential(1), 0, this._height, this._axis_size - 1);
    this._context.fillText(this._y[1].toExponential(1), 0, this._font_size, this._axis_size - 1);
    this._context.fillText(this._x[0].toExponential(1), this._axis_size, this._height + this._font_size + 2, this._axis_size - 1);
    this._context.fillText(this._x[1].toExponential(1), this._width, this._height + this._font_size + 2, this._axis_size - 1);
    // and x, y, axis titles
    this._context.fillText(this._x_name, this._width / 2.0, this._height + 2 * this._font_size, this._axis_size * 3);
    this._context.translate(this._font_size, this._height / 2);
    this._context.rotate(-Math.PI/2);
    this._context.fillText("lifetime", 0.0, 0.0, this._axis_size * 3 - 1);
    this._context.restore();
    // Now draw the selection area if needed
    if(this._mode == MMode.Down)
    {
      this._context.fillStyle = "rgba(0, 0, 255, 0.25)";
      this._context.fillRect(Math.min(this._start[0], this._current[0]), Math.min(this._start[1], this._current[1]),
                             Math.abs(this._start[0] - this._current[0]), Math.abs(this._start[1] - this._current[1]));
    }
  };
  // Start with a graph zoomed out
  this.reset();
  this.draw();
};
