$(document).ready(function() {
	var username = document.getElementById("username")
	var password = document.getElementById("password")
	$("a").click(function(e) {
		var aid = $(this).attr("href");
		if (aid == "#step3" && !username.value) return e.preventDefault()
		if (aid == "#step4" && !password.value) return e.preventDefault()
	});
	$(document).on("keydown", "input", function(event) {
		return event.key != "Enter";
	});
})