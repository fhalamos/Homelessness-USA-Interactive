//Based on https://stackoverflow.com/questions/38064029/d3-modifying-column-names
function removeYearFromColumnNames(d){
    Object.keys(d).forEach(function(origProp) {
        var noDot = origProp.split(",");
        if (noDot.length == 2) {
          d[noDot[0]] = d[origProp];
          delete d[origProp];
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
      promises.push(d3.csv(url, removeYearFromColumnNames));
  });

  Promise.all(promises).then(function(values) {
    

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



//Indicates if row is a row of totals per year (not a particular state)
function selectRow(d,state){
  if(d['State']===state){
    return true;
  }
  return false;
}



function createPlot(data){

  //Declare dimensions of plotting area
  const height = 600;
  const width = 1000;
  const margin = {top: 80, left: 100, right: 300, bottom: 50};

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.bottom - margin.top;

  //Calculate domains of x and y variables. We will use this for scalling
  const xDomain = data.reduce((acc, row) => {
    return {
      min: Math.min(row["Year"], acc.min),
      max: Math.max(row["Year"], acc.max)
    };
  }, {min: Infinity, max: -Infinity});

  const toNum = d => parseInt(d.replace(',',''));


  const yDomain = data.reduce((acc, row) => {
    const val = toNum(row["Overall Homeless"]);
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










  //Lines

  //Based on https://bl.ocks.org/gordlea/27370d1eea8464b04538e6d8ced39e89#index.html
  
  //OVERALL HOMELESS
  //d3's line generator


  var delay1=2000;
  var duration1=2000;

  var overall_line = d3.line()
      .x(function(d) { return xScale(d["Year"]); }) 
      .y(function(d) { return yScale(toNum(d["Overall Homeless"])); })
      .curve(d3.curveMonotoneX); // apply smoothing to the line

  //Append the path, bind the data, and call the line generator 
  g.append("path")
      .datum(
        data.filter(function(d){
          return isFinite(toNum(d["Overall Homeless"])) && selectRow(d,'Total');
        })
      ) // 10. Binds data to the line 
      .transition()
      .attr("opacity", 1)
      .duration(duration1)   
      .delay(delay1)
      .attr("class", "line_overall") // Assign a class for styling 
      .attr("d", overall_line) // Calls the line generator
      .transition()
      .duration(3000)
      //.remove();
      .attr("opacity", 0.2);

  //Legend
  g.append("rect")
    .transition()
    .duration(duration1)   
    .delay(delay1)
    .attr('class', 'rect overall')
    .attr('height',20)
    .attr('width',20)
    .attr('x', plotWidth+margin.right/2-25)
    .attr('y', 25)

  g.append("text")
    .transition()
    .duration(duration1)   
    .delay(delay1)
    .attr('class', 'text overall')
    .attr('height',20)
    .attr('width',20)
    .attr('x', plotWidth+margin.right/2)
    .attr('y', 40)
    .text('Overall homeless')



  var delay2=4000;
  var duration2=2000;

  //Sheltered homeless line
  
  var sheltered_line = d3.line()
      .x(function(d) { return xScale(d["Year"]); }) 
      .y(function(d) { return yScale(toNum(d["Sheltered Total Homeless"])); })
      .curve(d3.curveMonotoneX); // apply smoothing to the line

  g.append("path")
      .datum(
        data.filter(function(d){
          return isFinite(toNum(d["Sheltered Total Homeless"])) && selectRow(d,'Total');
        })
      ) 
      .transition()
      .attr("opacity", 1)
      .duration(duration2)   
      .delay(delay2)
      .attr("class", "line_sheltered") 
      .attr("d", sheltered_line)
      .transition()
      .attr("opacity", 0.2);
      //.remove();

  g.append("rect")
    .transition()
    .duration(duration2)   
    .delay(delay2)
    .attr('class', 'rect sheltered')
    .attr('height',20)
    .attr('width',20)
    .attr('x', plotWidth+margin.right/2-25)
    .attr('y', 55)

  g.append("text")
    .transition()
    .duration(duration2)   
    .delay(delay2)
    .attr('class', 'text sheltered')
    .attr('height',20)
    .attr('width',20)
    .attr('x', plotWidth+margin.right/2)
    .attr('y', 70)
    .text('Sheltered homeless')


  //Unsheltered homeless line
  var unsheltered_line = d3.line()
      .x(function(d) { return xScale(d["Year"]); }) 
      .y(function(d) { return yScale(toNum(d["Unsheltered Homeless"])); })
      .curve(d3.curveMonotoneX); // apply smoothing to the line

  g.append("path")
      .datum(
        data.filter(function(d){
          return isFinite(toNum(d["Unsheltered Homeless"])) && selectRow(d,'Total');
        })
      ) // 10. Binds data to the line 
      .transition()
      .attr("opacity", 1)
      .duration(duration2)   
      .delay(delay2)
      .attr("class", "line_unsheltered") 
      .attr("d", unsheltered_line)
      .transition()
      //.duration(3000)
      .attr("opacity", 0.2);
//      .remove();



  g.append("rect")
    .transition()
    .duration(duration2)   
    .delay(delay2)
    .attr('class', 'rect unsheltered')
    .attr('height',20)
    .attr('width',20)
    .attr('x', plotWidth+margin.right/2-25)
    .attr('y', 85)

  g.append("text")
    .transition()
    .duration(duration2)   
    .delay(delay2)
    .attr('class', 'text unsheltered')
    .attr('height',20)
    .attr('width',20)
    .attr('x', plotWidth+margin.right/2)
    .attr('y', 100)
    .text('Unsheltered homeless')







  var delay3=6000;
  var duration3=2000;


  //Homeless newyork
  var newyork_line = d3.line()
      .x(function(d) { return xScale(d["Year"]); }) 
      .y(function(d) { return yScale(toNum(d["Overall Homeless"])); })
      .curve(d3.curveMonotoneX); // apply smoothing to the line

  g.append("path")
      .datum(
        data.filter(function(d){
          return isFinite(toNum(d["Overall Homeless"])) && selectRow(d,'NY');
        })
      ) // 10. Binds data to the line 
      .transition()
      .attr("opacity", 1)
      .duration(duration3)   
      .delay(delay3)
      .attr("class", "line_newyork") 
      .attr("d", newyork_line)
      .transition()
      //.duration(3000)
      .attr("opacity", 0.2);
 
  g.append("rect")
    .transition()
    .duration(duration3)   
    .delay(delay3)
    .attr('class', 'rect newyork')
    .attr('height',20)
    .attr('width',20)
    .attr('x', plotWidth+margin.right/2-25)
    .attr('y', 115)

  g.append("text")
    .transition()
    .duration(duration3)   
    .delay(delay3)
    .attr('class', 'text newyork')
    .attr('height',20)
    .attr('width',20)
    .attr('x', plotWidth+margin.right/2)
    .attr('y', 130)
    .text('Homeless in NY')


  //Homeless michigan
  var michigan_line = d3.line()
      .x(function(d) { return xScale(d["Year"]); }) 
      .y(function(d) { return yScale(toNum(d["Overall Homeless"])); })
      .curve(d3.curveMonotoneX); // apply smoothing to the line

  g.append("path")
      .datum(
        data.filter(function(d){
          return isFinite(toNum(d["Overall Homeless"])) && selectRow(d,'TX');
        })
      ) // 10. Binds data to the line 
      .transition()
      .attr("opacity", 1)
      .duration(duration3)   
      .delay(delay3)
      .attr("class", "line_michigan") 
      .attr("d", michigan_line)
      .transition()
      //.duration(3000)
      .attr("opacity", 0.2);

  g.append("rect")
    .transition()
    .duration(duration3)   
    .delay(delay3)
    .attr('class', 'rect michigan')
    .attr('height',20)
    .attr('width',20)
    .attr('x', plotWidth+margin.right/2-25)
    .attr('y', 145)

  g.append("text")
    .transition()
    .duration(duration3)   
    .delay(delay3)
    .attr('class', 'text michigan')
    .attr('height',20)
    .attr('width',20)
    .attr('x', plotWidth+margin.right/2)
    .attr('y', 160)
    .text('Homeless in MI')


};
