const toNum = d => parseFloat(d.replace(',',''));

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

        //First parse all numbers from strings to int
        if(key!="State"){
          d[key] = toNum(d[key]);
        }       

        //Next change all keys (take out part after the commas)
        var splittedKey = key.split(",");
        if (splittedKey.length == 2) {
          d[splittedKey[0]] = d[key];
          delete d[key];
        }
     });
    return d;
};


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
    

    //Prepare data
    for (var i = 0; i< values.length-1; i++) {
      values[i].forEach(function(d) {
        d["Year"] = i+2007;
        data.push(d);
      });
    }


    var geodata = values[values.length-1];
    renderPage(data,geodata);
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


function renderPage(data,geodata){

  //   <p class="instructions">Select one (or more) states in the map to see how they have changed in time </p>

  // <p class="instructions"> </p0
  
  var homelessSubpopulations = ["Overall Homeless", "Chronically Homeless", "Homeless Veterans", "Sheltered Total Homeless", "Unsheltered Homeless"];
  var selectedColumn = homelessSubpopulations[0];

  d3.select('.instructions')
    .append('text')
    .attr('class','instructions_text')
    .text('Please select one homeless subpopulation,');

  d3.select('.instructions')
    .append('text')
    .attr('class','instructions_text')
    .text('and click on the states you would like to study');

  var selector = d3.select('.instructions')
    .append('select')
    .attr('class','selector')
    .on('change',onSubpopulationChange)

  var options = selector
    .selectAll('option')
    .data(homelessSubpopulations)
    .enter()
    .append('option')
    .text(function (d) { return d; });

  function onSubpopulationChange() {
    selectedColumn = d3.select('select').property('value')
    removeAllLines(selectedColumn);
    //location.reload();


  };

  createMap();

  //Declare dimensions of plotting area
  const height = 500;

  var width;
  if(window.innerWidth>1200){
    width = window.innerWidth/2.5;
  }
  else if (window.innerWidth>900){
    width = window.innerWidth/1.5;
  }
  else{
    width = window.innerWidth;
  }


  const margin = {top: 80, left: 100, right: 150, bottom: 80};

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.bottom - margin.top;



  // We create the svg, and set height and width 
  var svg_plot = d3.select('.plot')
    .append('svg')
    .attr('class', 'svg_plot')
    .attr('width', width)
    .attr('height', height)
  
  var g =  svg_plot.append('g')
    .attr('class','g_plot')
    .attr('transform',`translate(${margin.left},${margin.top})`);

  var all_selected_data=[];
  var firstUpdate=true;


  function removeAllLines(column) {

    d3.selectAll('.line_overall').remove();
    d3.selectAll('.text_legend').remove();
    d3.selectAll('.state').attr('stroke-width',1).attr('stroke','black').classed('selected',false);
    g.select('.y_axis_label').remove();
    all_selected_data=[];
    firstUpdate=true;
  }

  function updateLine(column, state,removeState=false){

    console.log("column");
    console.log(column);

    var selected_data= data.filter(function(d){
              return isFinite(d[column]) && selectRows(d,"State",state);
            })

    console.log("selected_data");
    console.log(selected_data);

    //Calculate domains of x and y variables. We will use this for scalling
    const xDomain = selected_data.reduce((acc, row) => {
      return {
        min: Math.min(row["Year"], acc.min),
        max: Math.max(row["Year"], acc.max)
      };
    }, {min: Infinity, max: -Infinity});

    //Scale for x acis: # of homeless programs
    var xScale = d3.scaleLinear()
      .domain([xDomain.min, xDomain.max])
      .range([0,plotWidth]); 




    console.log("xDomain");
    console.log(xDomain);

    // if(column!=lastColumnSelected){
    //     //We remove old plot and replace for a new one
    //     d3.select('.g_plot').remove();
    //     g =  svg_plot.append('g')
    //           .attr('class','g_plot')
    //           .attr('transform',`translate(${margin.left},${margin.top})`); 
    //     all_selected_data=[];
    //     firstUpdate=true;     
    // }


    if(firstUpdate){
      firstUpdate=false;

      g.select('.g_x_axis').remove();

      //X axis
      g.append('g')
        .attr('class','g_x_axis')
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
        .attr('transform', `translate(0,${plotHeight})`)        ;



      
      //Axis labels
      g.append("text")
        .attr("x", plotWidth/2)
        .attr("y", plotHeight+margin.bottom*2/3 )
        .style("text-anchor", "middle")
        .attr('font-size', 14)
        .text("Year");  

      g.append("text")
            .attr('class','y_axis_label')
            .attr("transform", "rotate(-90)")
            .attr("x", -plotHeight/2)
            .attr("y", -margin.left*2/3)
            .attr('font-size', 14)
            .style("text-anchor", "middle")
            .text("Number of "+column);

    var plot_title='Evolution of number of homeless';

    if(window.innerWidth<1200){
      plot_title='Evolution of homeless';
    }

      svg_plot
        .append('text')
        .attr('class', 'title')
        .attr('x', margin.left) 
        .attr('y', margin.top/2)
        .attr('text-anchor', 'left')
        .attr('font-size', 20)
        .attr('font-weight', 'bold')
        .attr('font-family', 'sans-serif')
        .text(plot_title);      



    }
    
    var duration1=2000;

   


    if(removeState){
      //remove each element of selected_data from all_selected_data
      selected_data.forEach(function(data){
        var index = all_selected_data.indexOf(data);
        all_selected_data.splice(index, 1);
      });
    }
    else{
      //Include each element of selecte_data in all_selected_data
      selected_data.forEach(function(data){
        all_selected_data.push(data);
      });
    }

    console.log('all_selected_data');
    console.log(all_selected_data);
    

    var yDomain = calculateDomain(all_selected_data,column);
  
    //Scale for y axis: # of homeless people
    var yScale = d3.scaleLinear()
      .domain([0, yDomain.max*1.01])
      .range([plotHeight,0]); 

    console.log("yDomain");
    console.log(yDomain);


    //Remove old y axis and append new
    d3.select(".y_axis").remove();

    var y_axis = g.append('g')
      .attr("class", "y_axis")
      .transition()
      .duration(1000)
      .call(d3.axisLeft(yScale));  



    var nested_data = d3.nest().key(function(d){return d["State"];}).entries(all_selected_data);
    console.log(nested_data)
   
    var overall_line = d3.line()
      .x(function(d) { return xScale(d["Year"]); }) 
      .y(function(d) { return yScale(d[column]); })
      .curve(d3.curveMonotoneX); // apply smoothing to the line 



    var lines = g.selectAll(".line_overall")
      .data(nested_data, function (d) { return d["key"] }) 

    
    var new_path = lines.enter()
      .append("path")
      .attr("class", "line_overall")
      .attr("stroke-width", 3)
      .attr("opacity", 1)
      .attr("d", function(d) { return overall_line(d.values); });

    console.log('new_path');
    console.log(new_path);


    lines.merge(new_path)
      .transition()
      .attr("stroke-width", 2)
      .attr("opacity", 0.5)  
      .transition()
      .duration(1000)
      .attr("d", function(d) { return overall_line(d.values) });      

    lines.exit()
    .transition()
    .attr("opacity", 0)
    .remove();




    //Used http://bl.ocks.org/duopixel/4063326 for animation
    if(!removeState){

      var totalLength = new_path.node().getTotalLength();
      new_path
        .attr("stroke-dasharray", totalLength) // the higer the dasharray, the longer the dashe
        .attr("stroke-dashoffset", totalLength) //where does the offset begins
        .transition()
        .duration(duration1)
        .ease(d3.easeLinear) // speed at which the path transitions
        .attr("stroke-dashoffset", 0);//where does the offset ends      
    }
    



    d3.select(".text_legend").remove();
    
    if(!removeState)
    {
      g.append("text")
      .attr('y', 5+yScale(selected_data[0][column]))
      .transition()
      .duration(duration1)   
      .attr('class', 'text_legend')
      .attr('height',20)
      .attr('width',20)
      .attr('x', 10+plotWidth)
      .attr('y', 5+yScale(selected_data[selected_data.length-1][column]))
      .text(abb_to_states[state]) 
      .attr("opacity", 0.2);
    }
  }


  //Used https://github.com/mcnuttandrew/capp-30239/tree/master/week-8-map
  //Used https://d3indepth.com/geographic/
  function createMap(){

    var width = window.innerWidth/2;

    var height = 800;

    var margin = {top: 80, left: 50, right: 50, bottom: 80};

    var mapWidth = width - margin.left - margin.right;
    var mapHeight = height - margin.bottom - margin.top;


    // we're going to be coloring our cells based on their homeless population so we should compute the
    // population domain

    var states_data= data.filter(function(d){
            return isFinite(d["Homeless/Capita"]) && selectRows(d,"State","Total",false);
          })




    const homelessDomain = calculateDomain(states_data,"Homeless/Capita");//computeDomain(statePops, 'pop');
   
    
    var colorScale = d3.scaleLinear()
    .domain([homelessDomain.min, homelessDomain.max])
    .range(["#ffffcc", "#006837"])
    .interpolate(d3.interpolateRgb);


    var data_2018= data.filter(function(d){
            return isFinite(d["Year"]) && selectRows(d,"Year",2018);
          })

    //Create map from state to number of homeless in 2018, used for coloring
    const state_to_pop = data_2018.reduce((acc, row) => {
      acc[row.State] = row["Homeless/Capita"];
      return acc;
    }, {});


    var map_title='Density of homeless per state';

    var projectionScale;
    var translateX;

    projectionScale=800;
    translateX=400;



    console.log(window.innerWidth);
    if(window.innerWidth>1550){
      console.log('hola');
      projectionScale=800;
      translateX=400;
    }
    else if(window.innerWidth>700) {
      projectionScale=700;
      translateX=300;
    }
    else {
      projectionScale=350;
      translateX=150;
    }

    //Now map and chart are in vertical order, so we can increase width    
    if(window.innerWidth<1200){
      map_title="Density of homeless"
      width = window.innerWidth;
      mapWidth = width - margin.left - margin.right;
    }

    var projection = d3.geoAlbersUsa()//geoEquirectangular();
     .scale(projectionScale)
     .translate([translateX, 250]);

    var geoGenerator = d3.geoPath(projection);

    var svg_map = d3.select(".map")
            .append("svg")
            .attr("width", mapWidth)
            .attr("height", mapHeight)

    svg_map
      .append('text')
      .attr('class', 'title')
      .attr('x', margin.left) 
      .attr('y', margin.top/2)
      .attr('text-anchor', 'left')
      .attr('font-size', 20)
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .text(map_title);  


    const g_map =  svg_map.append('g')
      .attr('transform',`translate(10,10)`);//${margin.left},${margin.top})`);



    //Based on http://bl.ocks.org/dougdowson/9832019
    var tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    var states_shapes = g_map.selectAll(".state")
            .data(geodata.features)
            .enter()
            .append('path')
            .attr("class", "state")
            .attr("d", geoGenerator)
            .attr("id", function(d) { return states_to_abb[d.properties.name]; })

            .attr('stroke', 'black')
            .attr('fill', "lightgrey")
            .attr('fill', function(d){
              
              return  colorScale(state_to_pop[states_to_abb[d.properties.name]]);})
            .on("click", function(d) {
             
              console.log(selectedColumn);
              if(d3.select(this).classed('selected')){
                //Remove! 

                console.log(d3.select('.text_legend'));
                d3.select('.text_legend').remove();
                d3.select(this).attr('stroke-width',1);
                d3.select(this).attr('stroke','black');
                updateLine(selectedColumn,states_to_abb[d.properties.name],true);
                d3.select(this).classed('selected',false);
              }
              else{//Not selected
                //Include!
                d3.selectAll('.state').attr('stroke','black'); //Set all states stroke in black
                d3.select(this).attr('stroke-width',4);

                d3.select(this).attr('stroke','blue');

                updateLine(selectedColumn,states_to_abb[d.properties.name]);

                d3.select(this).classed('selected',true); 

              }


            });

    //Add tooltips events. based on http://bl.ocks.org/dougdowson/9832019
    states_shapes
    .on("mouseover", function(d) {
      tooltip.transition()
      .duration(250)
      .style("opacity", 1);

      tooltip.html(d.properties.name)
      .style("left", (d3.event.pageX ) + "px") //Set position of tooltip
      .style("top", (d3.event.pageY) + "px");
    })
    .on("mouseout", function(d) {
      tooltip.transition()
      .duration(250)
      .style("opacity", 0);
    });

    //Used https://d3-legend.susielu.com/
    svg_map.append("g")
      .attr("class", "legendLinear")
      .attr('transform',`translate(40,500)`)
      .style("font-size","20px");


    var legendLinear = d3.legendColor()
      //.titleWidth(100)
      .title("Homeless every 1,000 people")      
      .shapeWidth(30)
      .orient('horizontal')
      .scale(colorScale);

    svg_map.select(".legendLinear")
      .call(legendLinear);


  }
};


var states_to_abb  ={
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

var abb_to_states = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AS": "American Samoa",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "DC": "District Of Columbia",
    "FM": "Federated States Of Micronesia",
    "FL": "Florida",
    "GA": "Georgia",
    "GU": "Guam",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MH": "Marshall Islands",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "MP": "Northern Mariana Islands",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PW": "Palau",
    "PA": "Pennsylvania",
    "PR": "Puerto Rico",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VI": "Virgin Islands",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
}