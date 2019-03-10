

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
  files.forEach(function(file_address) {
      promises.push(d3.csv(file_address, formatCSV));
  });

  //Load states geojson data
  promises.push(d3.json("./Data/states.json"));

  Promise.all(promises).then(function(values) {
    
    //console.log(values);
    //Prepare data
    for (var i = 0; i< values.length-1; i++) {
      values[i].forEach(function(d) {
        d["Year"] = getYear(i);
        data.push(d);
      });
    }

    var geodata = values[values.length-1];
    createPlot(data,geodata);
    //createMap();
  });

});




function selectRows(d,column,value,equalComparison=true){
  
  if(equalComparison){
    if(d[column]===value){
      return true;
    }
    return false;
  }
  else{
    if(d[column]!==value){
      return true;
    }
    return false; 
  }
}







function calculateDomain(data,column){

  return data.reduce((acc, row) => {
    const val = row[column];
    return {
      min: Math.min(isFinite(val) ? val : Infinity, acc.min),
      max: Math.max(isFinite(val) ? val : -Infinity, acc.max)
    };
  }, {min: Infinity, max: -Infinity});

}


function createPlot(data,geodata){

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


  const yDomain = calculateDomain(data,"Overall Homeless");
  console.log(yDomain);

  //Scale for y axis: # of homeless people
  const yScale = d3.scaleLinear()
    .domain([0, yDomain.max*1.01])
    .range([plotHeight,0]); 

  //Scale for x acis: # of homeless programs
  const xScale = d3.scaleLinear()
    .domain([xDomain.min, xDomain.max])
    .range([0,plotWidth]); 

  // We create the svg, and set height and width 
  const svg_plot = d3.select('.plot')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
  
  const g =  svg_plot.append('g')
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
  const title = svg_plot.selectAll('.title')
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
  const subtitle = svg_plot.selectAll('.subtitle')
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
  const caption = svg_plot.selectAll('.caption')
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


  createMap();

  function updateLine(column, state){

    var delay1=2000;
    var duration1=2000;



    var overall_line = d3.line()
        .x(function(d) { return xScale(d["Year"]); }) 
        .y(function(d) { return yScale(d[column]); })
        .curve(d3.curveMonotoneX); // apply smoothing to the line

    
    var selected_data= data.filter(function(d){
            return isFinite(d[column]) && selectRows(d,"State",state);
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


  //Used https://github.com/mcnuttandrew/capp-30239/tree/master/week-8-map
  //Used https://d3indepth.com/geographic/
  function createMap(){


    // we're going to be coloring our cells based on their homeless population so we should compute the
    // population domain

    var states_data= data.filter(function(d){
            return isFinite(d["Overall Homeless"]) && selectRows(d,"State","Total",false);
          })

    console.log(states_data);


    const homelessDomain = calculateDomain(states_data,"Overall Homeless");//computeDomain(statePops, 'pop');
   


    // the data that we will be iterating over will be the geojson array of states, so we want to be
    // able to access the populations of all of the states. to do so we flip it to a object representation
    
    // const stateNameToPop = statePops.reduce((acc, row) => {
    //   acc[row.state] = row.pop;
    //   return acc;
    // }, {});


//    const popScale = d3.scaleLinear().domain([homelessDomain.min, homelessDomain.max]).range([0, 1]);
//    const colorScale2 = d => d3.interpolateInferno(Math.sqrt(popScale(d)));
    
    var colorScale = d3.scaleLinear()
    .domain([homelessDomain.min, homelessDomain.max])
    .range(["#43bb38", "#e41a1c"]);


    var data_2018= data.filter(function(d){
            return isFinite(d["Year"]) && selectRows(d,"Year",2018);
          })

    //Create map from state to number of homeless in 2018, used for coloring
    const state_to_pop = data_2018.reduce((acc, row) => {
      acc[row.State] = row["Overall Homeless"];
      return acc;
    }, {});



    var projection = d3.geoAlbers();//geoEquirectangular();
     //.scale(400)
     //.translate([50, 400]);

    var geoGenerator = d3.geoPath(projection);


    var svg_map = d3.select(".map")
            .append("svg")
            .attr("width", 1000)
            .attr("height", 600)

    

    const g_map =  svg_map.append('g')
      .attr('transform',`translate(10,10)`);//${margin.left},${margin.top})`);

    g_map.selectAll(".state")
            .data(geodata.features)//geodata.features)
            .enter()
            .append('path')
            .attr("d", geoGenerator)
            //.attr("id", function(d) { return states_to_abb[d.properties.State]; })

            .attr('stroke', 'black')
            .attr('fill', "lightgrey")
            .attr('fill', function(d){
              var a = colorScale(state_to_pop[states_to_abb[d.properties.State]]);

              return a;})
            .on("click", function(d) {
              console.log(d);

              updateLine("Overall Homeless",states_to_abb[d.properties.State]);
            });
  }
};




var states_to_abb  =
  {
    'Alabama': 'AL',
    'Alaska': 'AK',
    'American Samoa': 'AS',
    'Arizona': 'AZ',
    'Arkansas': 'AR',
    'California': 'CA',
    'Colorado': 'CO',
    'Connecticut': 'CT',
    'Delaware': 'DE',
    'District Of Columbia': 'DC',
    'Federated States Of Micronesia': 'FM',
    'Florida': 'FL',
    'Georgia': 'GA',
    'Guam': 'GU',
    'Hawaii': 'HI',
    'Idaho': 'ID',
    'Illinois': 'IL',
    'Indiana': 'IN',
    'Iowa': 'IA',
    'Kansas': 'KS',
    'Kentucky': 'KY',
    'Louisiana': 'LA',
    'Maine': 'ME',
    'Marshall Islands': 'MH',
    'Maryland': 'MD',
    'Massachusetts': 'MA',
    'Michigan': 'MI',
    'Minnesota': 'MN',
    'Mississippi': 'MS',
    'Missouri': 'MO',
    'Montana': 'MT',
    'Nebraska': 'NE',
    'Nevada': 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    'Northern Mariana Islands': 'MP',
    'Ohio': 'OH',
    'Oklahoma': 'OK',
    'Oregon': 'OR',
    'Palau': 'PW',
    'Pennsylvania': 'PA',
    'Puerto Rico': 'PR',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    'Tennessee': 'TN',
    'Texas': 'TX',
    'Utah': 'UT',
    'Vermont': 'VT',
    'Virgin Islands': 'VI',
    'Virginia': 'VA',
    'Washington': 'WA',
    'West Virginia': 'WV',
    'Wisconsin': 'WI',
    'Wyoming': 'WY'
  }