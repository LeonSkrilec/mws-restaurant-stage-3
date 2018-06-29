let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

//DBHelper.syncData()


/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let ww = window.innerWidth;

  if (ww > 860) {
    startMap();
  }

  updateRestaurants();
}

startMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });

  addMarkersToMap();
}



/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      updateFoundRestaurantsNumber(restaurants);
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
  lazyLoad();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const detailsTemplate = document.getElementById("restaurant-listing-template");
  const newLi = document.importNode(detailsTemplate.content, true);

  if (DBHelper.imageUrlForRestaurant(restaurant)) {
    const image = newLi.querySelector('img');
    const imageName = DBHelper.imageUrlForRestaurant(restaurant);
    image.dataset.src = imageName + ".jpg";
    image.dataset.srcset = imageName + "@2x.jpg 2x";
    image.dataset.alt = "Image of " + restaurant.name;
  }

  const name = newLi.querySelector('h2');
  name.innerHTML = restaurant.name;

  const favStar = newLi.querySelector('.fav-star');
  if (DBHelper.isFavourited(restaurant)) {
    favStar.classList += " favourited";
  }
  favStar.addEventListener("click", toggleFavouriteRestaurant);
  favStar.dataset.restaurantId = restaurant.id;

  const neighborhood = newLi.querySelector('p.neighborhood');
  neighborhood.innerHTML = restaurant.neighborhood;

  const address = newLi.querySelector('p.address');
  address.innerHTML = restaurant.address;

  const more = newLi.querySelector('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);

  return newLi
}


function toggleFavouriteRestaurant(e) {
  var restaurantId = e.path[1].dataset.restaurantId;
  var restaurantAdded = DBHelper.toggleFavouriteRestaurant(restaurantId);

  if (restaurantAdded === false) {
    e.path[1].classList.remove("favourited");
  } else {
    e.path[1].classList += " favourited";
  }
}

/**
 * Initialize lazy load script for images
 * It uses intersection observers
 * https: //developers.google.com/web/updates/2016/04/intersectionobserver
 * Polyfill for older browsers!
 */

lazyLoad = () => {
  var lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));
  if ("IntersectionObserver" in window) {
    let lazyImageObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          let lazyImage = entry.target;
          lazyImage.src = lazyImage.dataset.src;
          lazyImage.srcset = lazyImage.dataset.srcset;
          lazyImage.alt = lazyImage.dataset.alt;
          lazyImage.classList.remove("lazy");
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });

    lazyImages.forEach(function (lazyImage) {
      lazyImageObserver.observe(lazyImage);
    });
  } else {
    // Possibly fall back to a more compatible method here
  }
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  if (!map || !restaurants)
    return false;

  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

/**
 * Updates number of found restaurants in restaurants list
 */

updateFoundRestaurantsNumber = (restaurants) => {
  const domEL = document.getElementById("results-found-number");
  if (restaurants.length > 0) {
    const pluralName = restaurants.length == 1 ? 'restaurant' : 'restaurants';
    domEL.innerHTML = '<p><span id="found-number">' + restaurants.length + '</span> ' + pluralName + ' found</p>';
  } else {
    domEL.innerHTML = '<p class="text-danger">No restaurants found.</p>'
  }
}