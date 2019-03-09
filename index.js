const toNum = d => parseInt(d.replace(',',''));

function calculateAverage(data,column){
  var sum=0;
  for (var row = 0; row < data.length; row++) {
    sum+=data[row][column];
  }
  return sum/data.length;
}

//Based on https://stackoverflow.com/questions/38064029/d3-modifying-column-names
function formatCSV(d){
    Object.keys(d).forEach(function(key) {

        //First parse all numbers
        if(key!="State"){
          d[key] = toNum(d[key]);
        }       

        //Next change all keys (take out part after the comma)
        var splittedKey = key.split(",");
        if (splittedKey.length == 2) {
          d[splittedKey[0]] = d[key];
          delete d[key];
        }


     });

    return d;
};


function getYear(i){
  return i+2007;  
}


//Wait until the page is loaded before we start to do thigs
document.addEventListener('DOMContentLoaded', () => {

  var files = []
  for (var i = 2007; i <= 2018; i++) {
    files.push("./Data/"+i.toString()+".csv");
  }

  var promises = [];
  var data =[];

  //Load all data from different files
  files.forEach(function(url) {
      promises.push(d3.csv(url, formatCSV));
  });

  Promise.all(promises).then(function(values) {
    
    //Prepare data
    for (var i = 0; i< values.length; i++) {
      values[i].forEach(function(d) {
        d["Year"] = getYear(i);
        data.push(d);
      });
    }

    console.log(data);
    createPlot(data);

  });

});

function selectRow(d,state){
  if(d['State']===state){
    return true;
  }
  return false;
}


function createPlot(data){

  //Declare dimensions of plotting area
  const height = 600;
  const width = 2000;
  const margin = {top: 80, left: 100, right: 400, bottom: 50};

  const plotWidth = width/2 - margin.left - margin.right;
  const plotHeight = height - margin.bottom - margin.top;
  let selectedLines = []

  //Calculate domains of x and y variables. We will use this for scalling
  const xDomain = data.reduce((acc, row) => {
    return {
      min: Math.min(row["Year"], acc.min),
      max: Math.max(row["Year"], acc.max)
    };
  }, {min: Infinity, max: -Infinity});


  const yDomain = data.reduce((acc, row) => {
    const val = row["Overall Homeless"];
    return {
      min: Math.min(isFinite(val) ? val : Infinity, acc.min),
      max: Math.max(isFinite(val) ? val : -Infinity, acc.max)
    };
  }, {min: Infinity, max: -Infinity});
  

  //Scale for y axis: # of homeless people
  const yScale = d3.scaleLinear()
    .domain([0, yDomain.max*1.05])//Multiply by 1.05 so that we can see a tick bigger than the max value
    .range([plotHeight,0]); // We want it to go from top to down

  //Scale for x acis: # of homeless programs
  const xScale = d3.scaleLinear()
    .domain([xDomain.min-0.1, xDomain.max+0.1])
    .range([0,plotWidth]); // We want it to go from right to left
    
  // We create the svg, and set height and width 
  const svg = d3.select('.main')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
  
  const g =  svg.append('g')
    .attr('transform',`translate(${margin.left},${margin.top})`);

  //Axis
  g.append('g')
    .call(d3.axisBottom(xScale))
    .attr('transform', `translate(0,${plotHeight})`);

  g.append('g')
    .call(d3.axisLeft(yScale));

  //Axis labels
  g.append("text")
    .attr("x", plotWidth/2)
    .attr("y", plotHeight+margin.bottom*2/3 )
    .style("text-anchor", "middle")
    .attr('font-size', 14)
    .text("Year");  

  g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -plotHeight/2)
        .attr("y", -margin.left*2/3)
        .attr('font-size', 14)
        .style("text-anchor", "middle")
        .text("Number of homeless");

  
  //Title
  const title = svg.selectAll('.title')
                    .data([{x: margin.left, 
                            y: margin.top*0.3, 
                            label: 'Evolution of number of homeless in time'}]);
 
  title.enter()
    .append('text')
    .attr('class', 'title')
    .attr('x', d => d.x) //Not using scaling here
    .attr('y', d => d.y)
    .attr('text-anchor', 'left')
    .attr('font-size', 20)
    .attr('font-weight', 'bold')
    .attr('font-family', 'sans-serif')
    .text(d => d.label);

  d3.select(".title").on("click",function () {
    update_graph();
  });


  //Subtitle
  const subtitle = svg.selectAll('.subtitle')
                      .data([{x: margin.left, y: margin.top*0.5,
                              label: 'Overall homeless decreases in time, but some subpopulations of homeless more than others'}]); 
  subtitle.enter()
    .append('text')
    .attr('class', 'subtitle')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('text-anchor', 'left')
    .attr('font-size', 16)
    .attr('font-family', 'sans-serif')
    .text(d => d.label);


  //Caption
  const caption = svg.selectAll('.caption')
                      .data([{x: plotWidth-300, y: height-3,
                              label: 'Source: U.S. Department of Housing and Urban Development (HUD)'}]); 
  caption.enter()
    .append('text')
    .attr('class', 'caption')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('text-anchor', 'left')
    .attr('font-size', 14)
    .attr('font-family', 'georgia')
    .attr('font-style', 'italic')
    .text(d => d.label);



  columns = ["Overall Homeless", "Unsheltered Homeless","Overall Homeless", "Unsheltered Homeless"]
  var states = ["Total","CA","Total","CA"];


  var iterator =0

  g.append("text")
    .attr('class', 'text')
    .attr('height',20)
    .attr('width',20)
    .attr('x', plotWidth+margin.right/2)
    .attr('y', plotHeight/2)
    .text('Click here to Start!')
    .on("click", function() {
     
      updateLine(columns[iterator],states[iterator]);
      iterator = iterator+1;

    });



  function updateLine(column, state){

    console.log(column);
    console.log(state);

    var delay1=2000;
    var duration1=2000;

    var overall_line = d3.line()
        .x(function(d) { return xScale(d["Year"]); }) 
        .y(function(d) { return yScale(d[column]); })
        .curve(d3.curveMonotoneX); // apply smoothing to the line

    
    var selected_data= data.filter(function(d){
            return isFinite(d[column]) && selectRow(d,state);
          })


    var line = g.selectAll(".line_overall")
      .data(selected_data, function (d) { return d["State"] })// ??
    

    line.enter()
      .append("path")
      .attr("class", "line_overall")
      .attr("d", overall_line(selected_data))
      .transition()
      .duration(duration1)
      .attr("opacity", 0.2);

    line.exit()
    .transition()
    .duration(1000)
    .attr("opacity", 0)
    .remove();


    //Legend
    var rect_legend = g.selectAll(".rect")
      .data(selected_data, function (d) { return d["State"] });// ??
    

    rect_legend
      .enter()
      .append("rect")
      .transition()
      .duration(duration1)
      .attr('class', 'rect')
      .attr('height',20)
      .attr('width',20)
      .attr('x', plotWidth+margin.right/2-25)
      .attr('y', yScale(calculateAverage(selected_data,column)))
      .attr("opacity", 0.2);
      
    rect_legend.exit()
    .transition()
    .duration(1000)
    .attr("opacity", 0)
    .remove();

    var text_legend = g.selectAll(".text_legend")
      .data(selected_data, function (d) { return d["State"] });
    

    text_legend
      .enter()
      .append("text")
      .transition()
      .duration(duration1)   
      .attr('class', 'text_legend')
      .attr('height',20)
      .attr('width',20)
      .attr('x', plotWidth+margin.right/2)
      .attr('y', yScale(calculateAverage(selected_data,column)))
      .text(column+" in "+state)
      .attr("opacity", 0.2);

    text_legend.exit()
    .transition()
    .duration(1000)
    .attr("opacity", 0)
    .remove();

  }


};
