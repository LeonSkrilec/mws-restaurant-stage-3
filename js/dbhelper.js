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
      "single": (id) => `http://localhost:${port}/restaurants/${id}`,
      "newReview": `http://localhost:${port}/reviews`,
      "restaurantReviews": (id) => `http://localhost:${port}/reviews/?restaurant_id=${id}`,
      "reviews": `http://localhost:${port}/reviews`
    }
  }

  /**
   * IndexedDB parameters
   */

  static get DB_PARAMS() {
    return {
      "db_name": "restaurant_reviews",
      "restaurants_object_store": "restaurants",
      "version": 5,
      "reviews_object_store": "reviews"
    }
  }


  /** 
   * Local storage parameters
   *
   **/

  static get STORAGE_PARAMS() {
    return {
      "favourites_key": "favourited-restaurants"
    }
  }

  /**
   * Create IndexedDB databases
   * Called everytime on load. Is this neccessary?
   * I think it is, because on load we can check if databases need to be upgraded
   */

  static setUpDatabases() {
    const DBOpenRequest = window.indexedDB.open(DBHelper.DB_PARAMS.db_name, DBHelper.DB_PARAMS.version);

    DBOpenRequest.onerror = (e) => {
      console.error("Error opening local database", e);
    }

    DBOpenRequest.onupgradeneeded = function (event) {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(DBHelper.DB_PARAMS.restaurants_object_store)) {
        db.createObjectStore(DBHelper.DB_PARAMS.restaurants_object_store, {
          keyPath: "id"
        });
      }

      if (!db.objectStoreNames.contains(DBHelper.DB_PARAMS.reviews_object_store)) {
        const reviewsTable = db.createObjectStore(DBHelper.DB_PARAMS.reviews_object_store, {
          keyPath: "id",
        });
        reviewsTable.createIndex("restaurant_id", "restaurant_id", {
          unique: false
        });
      }
    };
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
        DBHelper.fetchRestaurantsFromIDB().then((data) => {
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

      const tx = db.transaction([DBHelper.DB_PARAMS.restaurants_object_store], 'readwrite');
      const store = tx.objectStore(DBHelper.DB_PARAMS.restaurants_object_store);

      for (let i = 0; i < restaurants.length; i++) {
        store.add(restaurants[i]);
      }
    };
  }

  static fetchRestaurantsFromIDB() {
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

        const tx = db.transaction([DBHelper.DB_PARAMS.restaurants_object_store]);
        const store = tx.objectStore(DBHelper.DB_PARAMS.restaurants_object_store);

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

  static toggleFavouriteRestaurant(id) {
    var inserted = false;
    var localStorageItemKey = DBHelper.STORAGE_PARAMS.favourites_key;
    var currentFavourites = localStorage.getItem(localStorageItemKey);

    if (!currentFavourites) {
      localStorage.setItem(localStorageItemKey, "[]");
      currentFavourites = "[]";
    }
    var favsArray = JSON.parse(currentFavourites);

    //Given restaurant does not exists in favourites yet
    // Should be added
    if (favsArray.indexOf(id) == -1) {
      favsArray.push(id);
      inserted = true;
    } else {
      //Given restuarant exists already
      // SHould be deleted
      favsArray.splice(favsArray.indexOf(id), 1);
    }

    localStorage.setItem(localStorageItemKey, JSON.stringify(favsArray));

    return inserted;

  }


  /**
   * Returns TRUE / FALSE
   * Checks if resetaurant has been favourited (in local storage / IndexedDB)
   */

  static isFavourited(restaurant) {
    var localStorageItemKey = DBHelper.STORAGE_PARAMS.favourites_key;
    var currentFavourites = localStorage.getItem(localStorageItemKey);
    var stringifiedID = restaurant.id + "";

    if (!currentFavourites)
      return false;

    if (JSON.parse(currentFavourites).indexOf(stringifiedID) == -1)
      return false;
    else
      return true;
  }

  /**
   * Fetch reviews for single restaurant
   **/

  static fetchReviewsForRestaurant(id, callback) {

    DBHelper.syncData().then(() => {

      fetch(DBHelper.DATABASE_URL.restaurantReviews(id))
        .then((response) => response.json())
        .then((json) => {

          DBHelper.addReviewsToIDB(json, false);
          return callback(null, json);

        })
        .catch((e) => {
          //Could not fetch reviews. Network down?
          // Fetch from IndexedDB
          DBHelper.fetchReviewsForRestaurantFromIDB(id).then((data) => {
            return callback(null, data);
          }).catch((e) => {
            console.error(e);
            const error = (`Request failed. Returned status of ${e}`);
            return callback(error, null);
          });
        })


    }).catch((e) => {
      console.error("Failed to sync data", e);
    });



  }

  static fetchReviewsForRestaurantFromIDB(restaurant_id) {
    console.log("Fetching reviews from IDB ...");

    return new Promise((resolve, reject) => {

      if (!('indexedDB' in window))
        reject('This browser doesn\'t support IndexedDB')

      const DBOpenRequest = window.indexedDB.open(DBHelper.DB_PARAMS.db_name, DBHelper.DB_PARAMS.version);
      let db;
      let reviews = [];

      DBOpenRequest.onsuccess = (event) => {
        db = DBOpenRequest.result;

        const tx = db.transaction([DBHelper.DB_PARAMS.reviews_object_store]);
        const store = tx.objectStore(DBHelper.DB_PARAMS.reviews_object_store);

        return store.openCursor().onsuccess = function (event) {
          var cursor = event.target.result;

          if (cursor) {
            if (cursor.value.restaurant_id != restaurant_id)
              return cursor.continue();

            reviews.push(cursor.value);
            cursor.continue();
          } else {
            resolve(reviews);
          }
        };
      };

      DBOpenRequest.onerror = (e) => {
        reject("Error opening local database", e);
      }
    })
  }


  static addReview(data, callback) {
    console.log("adding review", data);
    DBHelper.postData(DBHelper.DATABASE_URL.newReview, data)
      .then(data => {
        if (callback)
          return callback(data, "server_database");
      })
      .catch(error => {
        // Could not save review
        // Maybe offline?
        console.log("Error saving review", error);
        if (callback)
          DBHelper.addReviewsToIDB(data, callback);
        else
          DBHelper.addReviewsToIDB(data);

      })
  }

  static addReviewsToIDB(data, callback) {
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return false;
    }


    const DBOpenRequest = window.indexedDB.open(DBHelper.DB_PARAMS.db_name, DBHelper.DB_PARAMS.version);
    let db;

    DBOpenRequest.onsuccess = () => {
      db = DBOpenRequest.result;

      const tx = db.transaction([DBHelper.DB_PARAMS.reviews_object_store], 'readwrite');
      const store = tx.objectStore(DBHelper.DB_PARAMS.reviews_object_store);

      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const review = data[i];
          store.add(review);
        }
      } else {
        data.id = +new Date();
        data.id = -data.id;
        store.add(data);
      }

      if (callback)
        callback(data, "local_database");
    };
  }



  static syncData() {
    // Check all local reviews
    // If there is any with negative id, send it to server and notify user

    return new Promise((resolve, reject) => {

      if (!('indexedDB' in window))
        reject('This browser doesn\'t support IndexedDB')

      const DBOpenRequest = window.indexedDB.open(DBHelper.DB_PARAMS.db_name, DBHelper.DB_PARAMS.version);
      let db;
      let reviews = [];

      DBOpenRequest.onsuccess = (event) => {
        db = DBOpenRequest.result;

        const tx = db.transaction([DBHelper.DB_PARAMS.reviews_object_store], "readwrite");
        const store = tx.objectStore(DBHelper.DB_PARAMS.reviews_object_store);

        return store.openCursor().onsuccess = function (event) {
          var cursor = event.target.result;
          var reviewsFound = 0;
          if (cursor) {
            if (cursor.value.id < 0) {
              // Sync this value
              const local_review = cursor.value;
              delete local_review.id; // Lets delete ID property so server will generate new one

              // Delete local review
              DBHelper.addReview(local_review, false);

              var request = cursor.delete();
              request.onsuccess = function () {
                offlineForm.notify("success", "Your review has been synced to our server!");
              };

              cursor.continue();

            } else {
              // We can close iteration, because id-s are in ascending order
              // and all positive ids were already synced
              resolve();
            }
          }

          resolve();

        };
      };

      DBOpenRequest.onerror = (e) => {
        reject("Error opening local database", e);
      }
    })
  }


  // HELPERS

  static postData(url, data) {
    return fetch(url, {
        body: JSON.stringify(data),
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST',
      })
      .then(response => response.json())
  }

}

DBHelper.setUpDatabases();