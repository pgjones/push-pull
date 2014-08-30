var push_pull = push_pull || {}; // Global namespace

/// Create a graph with a JQuery canvas object and a name for the x axis
push_pull.Graph = function(canvas, name)
{
  this._canvas = canvas;
  this._context = canvas[0].getContext("2d");
  this._data = [[0, 0]]; // Single point for default data
  this._axis_size = 30;
  this._height = this._context.canvas.height - this._axis_size;
  this._width = this._context.canvas.width - this._axis_size;
  this._log = false;
  this._x_name = name;

  /// On clicks change log to linear and vice versa
  this._canvas.on('mouseup', function(event) {this._log = !this._log; this.draw();}.bind(this));
  /// On double click display large graph
  this._canvas.on('dblclick', function(event) {push_pull.large_graph.show(this._data, this._x_name);}.bind(this));

  /// Update with data. data should be an array of [x, y] coordiantes
  this.update = function(data)
  {
    this._data = data;
    if(data.length === 0) // If the data is empty use a single point at 0, 0
    {
      this._x = [0, 1];
      this._y = [0, 1];
      this._data = [[0, 0]];
    }
    else
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
    }
    this.draw();
  };

  /// Draw the data
  this.draw = function()
  {
    this._context.save();
    this._context.clearRect(0, 0, this._context.canvas.width, this._context.canvas.height);
    // xscale * x = pixel coordinate
    var xscale = this._width / (this._x[1] - this._x[0]);
    if(this._log)
      xscale = this._width / (Math.log(this._x[1] / this._x[0]) / Math.LN10);
    // yscal * y = pixel coordinate
    var yscale = this._height / (this._y[1] - this._y[0]);
    var range = this._y[1] - this._y[0];
    for(var ipoint = 0; ipoint < this._data.length; ipoint++)
    {
      this._context.fillStyle = "black";
      var x = this._data[ipoint][0] - this._x[0];
      if(this._log)
        x = Math.log(this._data[ipoint][0] / this._x[0]) / Math.LN10;
      // Fill a 2x2 squre for each point, remember canvas coordinates are from 
      // top, left not bottom, left as in graphs
      this._context.fillRect(this._axis_size + xscale * x, (this._y[1] - this._data[ipoint][1]) * yscale - 1, 2, 2);
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
    this._context.fillText(this._y[1].toExponential(1), 0, 10, this._axis_size - 1);
    this._context.fillText(this._x[0].toExponential(1), this._axis_size, this._height + 10, this._axis_size - 1);
    this._context.fillText(this._x[1].toExponential(1), this._width, this._height + 10, this._axis_size - 1);
    // and x, y, axis titles
    if(this._log)
      this._context.fillText("log " + this._x_name, this._width / 2.0, this._height + 20, 60);
    else
      this._context.fillText(this._x_name, this._width / 2.0, this._height + 20, 60);
    this._context.translate(10, this._height / 2);
    this._context.rotate(-Math.PI/2);
    this._context.fillText("lifetime", 0.0, 0.0, this._axis_size - 1);
    this._context.restore();
  };
  // Start with a graph deviod of data
  this.update([]);
};
