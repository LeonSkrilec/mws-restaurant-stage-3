/**
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return {
      "all": `http://localhost:${port}/restaurants`,
      "single": (id) => `http://localhost:${port}/restaurants/${id}`
    }
  }

  /**
   * IndexedDB parameters
   */

  static get DB_PARAMS() {
    return {
      "db_name": "restaurant_reviews",
      "object_store": "restaurants",
      "version": 1
    }
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {

    /** 
     * If we can not fetch, return json from IndexedDB
     * If json is not in IndexedDB, return error
     */

    fetch(DBHelper.DATABASE_URL.all)
      .then(response => response.json()).then(
        json => {
          const restaurants = json;
          DBHelper.saveRestaurantsToDB(restaurants);
          return callback(null, restaurants);
        }
      ).catch(e => {
        let cachedRestaurantsData = DBHelper.fetchRestaurantsFromIndexedDB().then((data) => {
          return callback(null, data);
        }).catch((e) => {
          console.error(e);
          const error = (`Request failed. Returned status of ${e}`);
          return callback(error, null);
        });
      });
  }

  static saveRestaurantsToDB(restaurants) {

    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return false;
    }

    const DBOpenRequest = window.indexedDB.open(DBHelper.DB_PARAMS.db_name, DBHelper.DB_PARAMS.version);
    let db;

    DBOpenRequest.onsuccess = (event) => {
      db = DBOpenRequest.result;

      const tx = db.transaction([DBHelper.DB_PARAMS.object_store], 'readwrite');
      const store = tx.objectStore(DBHelper.DB_PARAMS.object_store);

      for (let i = 0; i < restaurants.length; i++) {
        store.add(restaurants[i]);
      }
    };

    DBOpenRequest.onerror = (e) => {
      console.error("Error opening local database", e);
    }

    DBOpenRequest.onupgradeneeded = function (event) {
      const db = event.target.result;

      const objectStore = db.createObjectStore(DBHelper.DB_PARAMS.object_store, {
        keyPath: "id"
      });
    };
  }

  static fetchRestaurantsFromIndexedDB() {
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return false;
    }

    const DBOpenRequest = window.indexedDB.open(DBHelper.DB_PARAMS.db_name, DBHelper.DB_PARAMS.version);
    let db;
    let restaurants = [];

    return new Promise((resolve, reject) => {
      DBOpenRequest.onsuccess = (event) => {
        db = DBOpenRequest.result;

        const tx = db.transaction([DBHelper.DB_PARAMS.object_store]);
        const store = tx.objectStore(DBHelper.DB_PARAMS.object_store);

        return store.openCursor().onsuccess = function (event) {
          var cursor = event.target.result;
          if (cursor) {
            restaurants.push(cursor.value);
            cursor.continue();
          } else {
            resolve(restaurants);
          }
        };
      };

      DBOpenRequest.onerror = (e) => {
        reject("Error opening local database");
      }
    })


  }


  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return restaurant.photograph ? (`/img/${restaurant.photograph}`) : false;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

}