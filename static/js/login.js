(function($) {
	$("#submit").click(function() {
		var name = $('#name').val();
		var password = $('#password').val();
		$.ajax({
			url: '/login',
			type: 'post',
			data: {
				name: name,
				password: password
			},
			success: function(data) {
				console.log(data);
				if(data=="success"){
					window.location.href='index';
				}
			},
			error: function(error) {
				console.log(error);
			}
		});
	});
})(jQuery);