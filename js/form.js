class offlineForm {

  constructor() {
    this.form = document.getElementById("review-form");

    this.nameInput = document.getElementById("name-field");
    this.ratingSelect = document.getElementById("rating-select");
    this.reviewTextarea = document.getElementById("review-text");
    this.restaurantIdInput = document.getElementById("restaurant-id-field");
    this.form.addEventListener("submit", this.submit.bind(this));

  }

  submit(e) {
    e.preventDefault();
    this.setValues();

    if (!this.validate())
      return this.onError(e);

    this.post();

  }

  post() {
    const data = {
      restaurant_id: parseInt(this.restaurantId),
      name: this.name,
      rating: this.rating,
      comments: this.reviewText,
      created_at: +new Date()
    };
    DBHelper.addReview(data, (savedReview, savedStorage) => {
      const ul = document.getElementById('reviews-list');
      ul.appendChild(createReviewHTML(savedReview));
      this.reset();

      if (savedStorage == "server_database")
        offlineForm.notify("success", "Your review has been added!");
      else if (savedStorage == "local_database")
        offlineForm.notify("primary", "Your review has been addded, but it is not visible to public yet. Please connect to internet to make your review public.");
      else
        console.error("Unknown saved storage returned from addReview.");
    });
  }

  reset() {
    this.form.reset();
  }

  static notify(type, message) {
    if (document.getElementById("alert-dialog"))
      document.getElementById("alert-dialog").remove();

    const notification = document.createElement("div");
    document.body.appendChild(notification);
    notification.id = "alert-dialog";
    notification.classList = type;
    notification.innerText = message;

    notification.classList += " in";

    setTimeout(() => {
      notification.classList.remove("in");
    }, 6000);
  }


  setValues() {
    this.name = this.nameInput.value.trim();
    this.rating = this.ratingSelect.options[this.ratingSelect.selectedIndex].value;
    this.reviewText = this.reviewTextarea.value.trim();
    this.restaurantId = this.restaurantIdInput.value;
  }

  validate() {
    if (this.name == "" || this.rating == "" || this.reviewText == "" || this.restaurantId == "")
      return false;

    return true;
  }

  onError() {
    alert("Something went wrong. Please check if form was filled correctly and try again.");
    return false;
  }
}