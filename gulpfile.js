var gulp = require("gulp");
var browserSync = require("browser-sync").create();



gulp.task('watch', function () {
    gulp.watch("*.html").on("change", browserSync.reload);
    gulp.watch("js/**/*.js").on("change", browserSync.reload);
});



gulp.task('default', ["watch"]);

browserSync.init({
    server: "./",
    port: 8000
});
browserSync.stream();