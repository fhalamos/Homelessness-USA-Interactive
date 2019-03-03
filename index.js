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
function isTotalRow(d){
  if(d['State']==='Total'){
    return true;
  }
  return false;
}


function createPlot(data){

  //Declare dimensions of plotting area
  const height = 600;
  const width = 800;
  const margin = {top: 80, left: 100, right: 70, bottom: 50};

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.bottom - margin.top;

  //Calculate domains of x and y variables. We will use this for scalling
  const xDomain = data.reduce((acc, row) => {
    return {
      min: Math.min(row["Year"], acc.min),
      max: Math.max(row["Year"], acc.max)
    };
  }, {min: Infinity, max: -Infinity});

  const toNum = d => parseInt(d.replace(',','')) 


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
  


  const overall_circles = g.selectAll('.circ overall')
    .data(data.filter(function(d){
      return isFinite(toNum(d["Overall Homeless"])) && isTotalRow(d);
      }));

  overall_circles.enter()
    .append('circle')
    .transition()
    .duration(1000)   
    .delay( d => (d["Year"]-2007)*100)
    .attr('class', 'circ overall')
    .attr('r', 5)
    .attr('cx', d => xScale(d["Year"]))
    .attr('cy', d => yScale(toNum(d["Overall Homeless"])));
     

  const sheltered_circles = g.selectAll('.circ sheltered')
    .data(data.filter(function(d){
      return isFinite(toNum(d["Sheltered Total Homeless"])) && isTotalRow(d);
      }));

  sheltered_circles.enter()
    .append('circle')
    .transition()
    .duration(500)   
    .delay(d => 2000+(d["Year"]-2007)*100)
    .attr('class', 'circ sheltered')
    .attr('r', 5)
    .attr('cx', d => xScale(d["Year"]))
    .attr('cy', d => yScale(toNum(d["Sheltered Total Homeless"])));
   
  const unsheltered_circles = g.selectAll('.circ unsheltered')
    .data(data.filter(function(d){
      return isFinite(toNum(d["Unsheltered Homeless"])) && isTotalRow(d);
      }));

  unsheltered_circles.enter()
    .append('circle')
    .transition()
    .duration(500)   
    .delay(d => 2000+(d["Year"]-2007)*100)
    .attr('class', 'circ unsheltered')
    .attr('r', 5)
    .attr('cx', d => xScale(d["Year"]))
    .attr('cy', d => yScale(toNum(d["Unsheltered Homeless"]))); 

   
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
};
