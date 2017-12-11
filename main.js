
// the width and height of the SVG 
var width = 1200,
    height = 550
    // making our header as wide as our width specified in the HTML
// really could be done in html , but I wanted to practice using d3.select and appending stuff, but this is the title of the page  
var h1 = d3.select('body')
    .append('h1') // making a new div svg element 
    .text("Dorling Cartograms from U.S. Census Data ")

// second header that will display the current category being shown  
var h2 = d3.select('body')
    .append('h2') // making a new div svg element 
    .attr('class', 'h2') // giving it the appropriate class name
    .text("U.S States by Total Population")

// making our svg selection and giving it their width and height 
var svg = d3.select("body").append("svg")
    .attr("width", width ) 
    .attr("height", height )

// making a transition variable to reference for all transitions later on  
var t = d3.transition()
    .duration(1500)
    .ease(d3.easeLinear) // I used ease Linear after trying out all the different ease variables 


//making a hashmap with the keys being state names  and values being total populations   
var population = d3.map();

// similar hashmap but states and their Median income 
var income = d3.map();

// scale of states total population 
var radius_pop = d3.scaleSqrt().range([15, 30]);

// scale of the states by average income 
var radius_income = d3.scaleSqrt().range([10, 30]);

/* the geoscale that will project our 
feature coordinates to their appropriate position as U.S states 
*/
var projection = d3.geoAlbersUsa();

// shout outs to color brewer with this color blind friendly color
var colors = ["#edf8e9",
    "#bae4b3",
    "#74c476",
    "#31a354",
    "#006d2c"
]


// making a color scales that  will have the same color but the domain will differ 

var color_pop = d3.scaleQuantize().range(colors);
var color_income = d3.scaleQuantize().range(colors)

// making our simulation a global variable that can be referenced in other functions when they need to be update 
var simulation = d3.forceSimulation()


// making a formatter that rounds to 2 significant digits that simplifies our legend 
var pop_formatter = d3.format(",.2r");
var income_formatter = d3.format("$,.2r")


// using g for our legend
var g = svg.append("g").attr("class", "legend")
    .attr("transform", "translate(925, 350)");

// the legend constructor that will be called on later
var legend = d3.legendColor();

// creating event listeners for start and update
var dispatch = d3.dispatch("start", 'update', "reload");

// a boolean that tells my update chart dispatch whether or not to make a graph of the total population 
var pop_bool = true;

// a queue that will process my data that will then be invoked 
d3.queue()
    .defer(d3.csv, "./data/acs_pop_income.csv", function(csv) {
        // filling in the values of my hashmaps 
        population.set(csv.name, +csv.total_pop)
        income.set(csv.name, +csv.median_income)

        // getting the min and max for the radius and the color scales of
        // both total population and Median  income  
        var max_pop = d3.max(population.values())
        var max_income = d3.max(income.values())
            // filling in the values for all scales  
        radius_pop.domain([0,max_pop])
        color_pop.domain([0,max_pop])
        radius_income.domain([0,max_income])
        color_income.domain([0,max_income])

    })
    .defer(d3.json, "./data/us-states-centroids.json")
    .await(main);


// main function that draws the initial making a graph
function main(error, csv, geojson) {
    // should it error throw error  and halt the function 
    if (error) throw error;

    // making nodes Javascript Object , I'm making it global so I can use it later   
    var data = geojson.features.map(function(d) {
        var point = projection(d.geometry.coordinates),
            value_pop = population.get(d.properties.name), // returns the total population for the state
            value_income = income.get(d.properties.name) // returns the median income for the state

        return {
            id: d.id, //numbered id
            name: d.properties.name, //full name of the state 
            label: d.properties.label, // two letter shorthand for the states 
            coords: d.geometry.coordinates, // the geometric coordinates 
            x: +point[0], //point that will change as the forcesimulation is running 
            y: +point[1], //point that will change as the forcesimulation is running 
            x0: +point[0], //projected point  
            y0: +point[1], //projected point 
            r_pop: +radius_pop(value_pop), // returns the radius of the respecting  value 
            r_income: +radius_income(value_income), // returns the radius of the respecting  value 
            total_population: +value_pop, // actual value of the key 
            income: +value_income, // actual value of the key 
            proj: point // the array of our projected point
        };
    });
    // will call on our start event listners which subsequently produces the circles , legend, button, and title 
    dispatch.call('start', this, data);
};

// making our initial set of circles 
dispatch.on("start.circles", function(data) {

    // giving our simulation its intial forces  



    // first I create node classes that will contain both my circles and text

    var circles = svg.selectAll(".circles")
        .data(data).enter()
        .append("circle")
        .attr("class", "circles");

    circles //giving each circle I am about to make a class of .circles
        .attr('cx', function(d) {
            return d.x0;
        })
        .attr('cy', function(d) {
            return d.y0;
        })
        .attr('r', function(d) {
            return +d.r_pop;
        })
        .attr("fill", function(d) {
            return color_pop(population.get(d.name));
        })
        .attr("stroke", "black").on("mouseover", function(d) {
            if (pop_bool) {
                tooltip.html(d.name + "<br>" + " Pop " + pop_formatter(d.total_population));
                tooltip.style("visibility", "visible");
                d3.select(this)
                    .attr("stroke", "green") // gave it a bigger stroke width so the user knows which circle that are currently hovering over 
                    .attr("stroke-width", 3);
            } // our tooltip has the name of the circle then a line break then the gdp parsed into a string 
            else {
                tooltip.html(d.name + "<br>" + income_formatter(d.income));
                tooltip.style("visibility", "visible");
                d3.select(this)
                    .attr("stroke", "green") // gave it a bigger stroke width so the user knows which circle that are currently hovering over 
                    .attr("stroke-width", 3);
            }
        })
        .on("mousemove", function() {
            tooltip.html(d.name)
        })
        .on('mousemove', function() {
            tooltip // pageX and Page Y are the current coordinates of the mouse , we move them because if they were touching the cursor then the tool tip would disappear also it would be hard to read 
                .style('top', (d3.event.pageY - 10) + 'px')
                .style('left', (d3.event.pageX + 10) + 'px');
        })
        .on('mouseout', function() {
            tooltip
                .style('visibility', 'hidden'); // making our tooltip invisible when the mouse is not over a circle 

            d3.select(this) // this refers to the context of the node 
                .attr('stroke', '#333') // change the color back to black 
                .attr("stroke-width", 1); // making the border the same as before 
        })

    // appending text to go along with each circle
    var text_elems = svg.selectAll(".text")
        .data(data).enter().append("text")
        .attr("class", "text")

    text_elems.text(function(d) {
            return d.label
        }).attr('dx', function(d) {
            return d.x0;
        })
        .attr('dy', function(d) {
            return d.y0;
        }).attr("text-anchor", "middle")
        .on("mouseover", function(d) {
            if (pop_bool) {
                tooltip.html(d.name + "<br>"+"Pop " + pop_formatter(d.total_population) );
                tooltip.style("visibility", "visible");
            } // our tooltip has the name of the circle then a line break then the gdp parsed into a string 
            else {
                tooltip.html(d.name + "<br>" + income_formatter(d.income));
                tooltip.style("visibility", "visible");

            }
        })
        .on("mousemove", function() {
            tooltip.html(d.name)
        })
        .on('mousemove', function() {
            tooltip // pageX and Page Y are the current coordinates of the mouse , we move them because if they were touching the cursor then the tool tip would disappear also it would be hard to read 
                .style('top', (d3.event.pageY - 10) + 'px')
                .style('left', (d3.event.pageX + 10) + 'px');
        })
        .on('mouseout', function() {
            tooltip
                .style('visibility', 'hidden'); // making our tooltip invisible when the mouse is not over a circle 

        })



    // made a button with html
    var button = d3.select("body").append("div").attr("class","button").append("text").text("Toggle Category: ").append("button")
        .text("Median Income")

    button.on("click", function() { //when clicked this button will determine what graph is made according to the boolean

        if (pop_bool) {
            pop_bool = false;
            dispatch.call("update", this, pop_bool)

        } else {
            pop_bool = true;
            dispatch.call("update", this, pop_bool)

        }
    })

    simulation.force("charge", d3.forceManyBody().strength(1))
        .force("collision", d3.forceCollide().strength(1).radius(function(d) {
            return +d.r_pop; // each node will have a radius equivalent to the scale 
        })).nodes(data)
        .on("tick", ticked)
});

// starts our legend first and select menu
dispatch.on("start.menu", function() {

    // making a header element 
    // giving our header a margin left of 20 px 


    // filling in the attributes that legend requires so we can call it later 
    legend.title("Total Population (rounded to 2 sig Figs)").titleWidth(150)
        .labelFormat(pop_formatter)
        .shape("circle")
        .scale(color_pop)

    g.call(legend) // creates a legend with the above specified title and has appropriate scales 
 

})

// update event where our title , button and legend are all updated 
dispatch.on("update.menu", function(show_pop) {
    // making transition selectors 
    var buttontext = d3.select("button").transition(t)
    var h2text = d3.select(".h2").transition(t)

    // html will update depending on the boolean
    if (show_pop) {
        
        h2text.text("U.S States by Total Population ")
        buttontext.text("Median Income")
        legend.title("Total Population (rounded to 2 sig Figs)").titleWidth(100)
            .scale(color_pop)
            .labelFormat(pop_formatter)
        g.call(legend)

    } else {
        
        h2text.text("U.S States by Median Income ")
        buttontext.text("Total Population ")
        legend.title("Median Income (rounded to 2 sig Figs)").titleWidth(100)
            .scale(color_income)
            .labelFormat(income_formatter)
        g.call(legend)
    }
})

// updates our circles 
dispatch.on("update.circles", function(show_pop) {


    // n selects all nodes in the DOM, I pass in simulation.nodes()
    var cir = d3.selectAll(".circles")
    var texts = d3.selectAll(".text")
    simulation.stop()

    var data = simulation.nodes().map(function(d) {
        var point = projection(d.coords)

        return {
            id: d.id, //numbered id
            coords: d.coords, // the geometric coordinates 
            name: d.name,
            label: d.label,
            x: +point[0], //point that will change as the forcesimulation is running 
            y: +point[1], //point that will change as the forcesimulation is running 
            x0: +point[0], //projected point  
            y0: +point[1], //projected point 
            r_pop: +d.r_pop, // returns the radius of the respecting  value 
            r_income: +d.r_income, // returns the radius of the respecting  value 
            total_population: +d.total_population, // actual value of the key 
            income: +d.income, // actual value of the key 
            proj: point // the array of our projected point
        };
    });
    cir.data(data)
    texts.data(data)



    // I try to get the simulation to stop before we start another one 
    // depending on the boolean we will display different circles with different radius 
    if (pop_bool) {

        d3.selectAll(".circles").transition(t)
            .attr('r', function(d) {
                return +d.r_pop;
            })
            .attr("fill", function(d) {
                return color_pop(population.get(d.name));
            }).attr('cx', function(d) {
                return d.x0;
            })
            .attr('cy', function(d) {
                return d.y0;
            })
        d3.selectAll(".text").transition(t)
            .attr('dx', function(d) {
                return d.x0;
            })
            .attr('dy', function(d) {
                return d.y0;
            })

        dispatch.call("reload", this)


    } else {

        d3.selectAll(".circles").transition(t)
            .attr('r', function(d) {
                return +d.r_income;
            })
            .attr("fill", function(d) {
                return color_income(income.get(d.name));
            }).attr('cx', function(d) {
                return d.x0;
            })
            .attr('cy', function(d) {
                return d.y0;
            })
        d3.selectAll(".text").transition(t).attr('dx', function(d) {
                return d.x0;
            })
            .attr('dy', function(d) {
                return d.y0;
            })

        dispatch.call("reload", this)
    }
});


dispatch.on("reload.simulation", function() {
    var b = d3.selectAll(".circles")

    if (pop_bool) {
        
        simulation.force("collision",
                d3.forceCollide().strength(1).radius(function(d) {
                    return +d.r_pop;
                })).alpha(1).restart().nodes(b.data())
            // .on("tick", ticked)
    } else {
        
        simulation.force("collision",
                d3.forceCollide().strength(1).radius(function(d) {
                    return +d.r_income;
                })).alpha(1).restart().nodes(b.data())
            // .on("tick", ticked)

    }
})


// our tooltip to display over each circle hovered over 
var tooltip = d3.select('body')
    .append('div')
    .style('position', 'absolute') // causes our tooltip to be over our circle 
    .style('visibility', 'hidden') // our tooltip is by default hidden 
    .style('color', 'white') // the text will be white 
    .style('padding', '8px') // gave our tooltip some padding so the text can be nicely centered 
    .style('background-color', '#626D71') // giving our tooltip some slightly gray color 
    .style('border-radius', '6px') // giving our text box a radius for 6 px so that it looks like a rectangle with rounded edges 
    .style('text-align', 'center') // centering our space 
    .style('font-family', 'monospace') // giving it a monspace font family 
    .text('');

// our tick function that updates our g node
function ticked() {

    d3.selectAll(".circles")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
    d3.selectAll(".text")
        .attr("dx", d => d.x)
        .attr("dy", d => d.y)

}

