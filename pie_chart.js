var push_pull = push_pull || {}; // Global namespace

/// Create a pie chart with a JQuery canvas object, a table object and a 
/// selection type
push_pull.PieChart = function(canvas, table, type)
{
  this._canvas = canvas;
  this._table = table;
  this._context = canvas[0].getContext("2d");
  this._center = [this._context.canvas.width / 2, this._context.canvas.height / 2];
  this._radius = this._context.canvas.width / 2 - 40;
  this._selected = -1;
  this._type = type;
  this._data = [];
  this._colours = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"] // Colours by id
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
    if(this._selected > -1 && this._selected < this._colours.length)
      push_pull.change_selection(this._type, this._data[this._selected][2]);
  }
  /// This picks the sector the mouse is over (if any)
  this.pick = function(event)
  {
    var x = event.pageX - this._canvas.offset().left;
    var y = event.pageY - this._canvas.offset().top;
    var distance2 = Math.pow(x - this._center[0], 2) + Math.pow(y - this._center[1], 2);
    if(distance2 > Math.pow(this._radius, 2))
    {
      this._selected = -1;
    }
    else
    {
      var angle = Math.atan2(y - this._center[1], x - this._center[0]);
      if(angle < 0.0)
        angle = 2.0 * Math.PI + angle;
      for(var idata = 0; idata < this._data.length; idata++)
      {
        if(angle > this._data[idata][0] && angle < this._data[idata][1])
        {
          this._selected = idata;
          break;
        }
      }
    }
    this.draw();
  }

  /// Update with data. data should be a sorted array of multiple 3 element 
  /// arrays, [count, name, image-url]
  this.update = function(data)
  {
    var total = 0;
    // First calculate the total
    for(var idata = 0; idata < data.length; idata++)
      total += data[idata][0];
    // Now create the [start_angle, end_angle, name, image, colour] array used 
    // in this class for all the data or the first this._colours.length if 
    // limited by the number of colours
    this._data = [];
    var start_angle = 0.0;
    for(var idata = 0; idata < Math.min(this._colours.length, data.length); idata++)
    {
      var image = push_pull.images[data[idata][2]];
      if(image === undefined)
      {
        image = new Image();
        image.src = data[idata][2];
        push_pull.images[data[idata][2]] = image;
        image.onload = function() {this.draw();}.bind(this)
      }
      var end_angle = start_angle + data[idata][0] / total * 2.0 * Math.PI;
      this._data.push([start_angle,
                       end_angle,
                       data[idata][1],
                       image,
                       this._colours[idata]]);
      start_angle = end_angle;
    }
    // Add a others if needed 
    if(2.0 * Math.PI - start_angle > 0.0)
    {
      this._data.push([start_angle,
                       2.0 * Math.PI,
                       "others",
                       null,
                       "black"]);
    }
    // Now update the table
    this._table.empty();
    var select_generator = function(type, name) { return function(event) {push_pull.change_selection(type, name);} };
    for(var idata = 0; idata < data.length; idata++)
    {
      var row = $('<tr style="cursor:pointer;"><td>' + data[idata][0] + '</td><td><img src="' + data[idata][2] + '" width="20" height="20"></td><td>' + data[idata][1] + '</td></tr>');
      row.on('click', select_generator(this._type, data[idata][1]));
      this._table.append(row);
    }
    this.draw();
  }

  /// Draw the data
  this.draw = function()
  {
    this._context.save();
    this._context.clearRect(0, 0, this._context.canvas.width, this._context.canvas.height);
    // Loop over the data (or just the first N if limited by colours)
    for(var idata = 0; idata < this._data.length; idata++)
    {
      if(idata == this._selected)
        this._context.fillStyle = "Cyan";
      else
        this._context.fillStyle = this._data[idata][4];
      this._context.beginPath();
      this._context.moveTo(this._center[0], this._center[1]);
      this._context.arc(this._center[0], this._center[1], this._radius, this._data[idata][0], this._data[idata][1]);
      this._context.lineTo(this._center[0], this._center[1]);
      this._context.closePath();
      this._context.fill();
      var image_angle = (this._data[idata][0] + this._data[idata][1]) / 2.0;
      var image = this._data[idata][3];
      var image_position = [this._center[0] + (this._radius + 15) * Math.cos(image_angle) - 10, 
                            this._center[1] + (this._radius + 15) * Math.sin(image_angle) - 10];
      if(image != null)
        this._context.drawImage(image, 0, 0, image.width, image.height,
                                image_position[0],
                                image_position[1], 20, 20);
      //this._context.fillText(this._data[idata][2], image_position[0], image_position[1] + 30, 20);
    }
    this._context.restore();    
  }
  this.update([]);
}
