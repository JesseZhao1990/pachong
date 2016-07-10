(function($) {
	$.ajax({
		url:'/getTime',
		type:'get',
		success:function(data){
			console.log(data);
		},
		error:function(error){
			console.log(error);
		}
	});
	$.ajax({
		url: '/ganjicatergarylist',
		type: 'get',
		success: function(data) {
			var htmlStr = "";
			for (var i = 0; i < data.length; i++) {
				htmlStr += '<tr>' +
					'<td>' + (i + 1) + '</td>' +
					'<td><a  target="_blank" href="' + data[i].url + '">' + data[i].name + '</a></td>' +
					'<td><i class="fa fa-search" aria-hidden="true"></i></td>' +
					'</tr>';
			}
			$("#catagraylist").html(htmlStr);
		},
		error: function(error) {
			console.log(error);
		}
	});


	$('#catagraylist').on('click', '.fa-search', function() {
		console.log("1111");
		var url = $(this).parents('tr').find('a').attr('href');
		var $thistr = $(this).parents('tr');
		$.ajax({
			url: '/catatery',
			type: 'post',
			data: {
				url: url
			},
			success: function(data) {
				console.log(data);
				var htmlStr = "";
				for (var i = 0; i < data.length; i++) {
					htmlStr += '<tr>' +
						'<td>' + (i + 1) + '</td>' +
						'<td><a  target="_blank" href="' + data[i].companyHref + '">' + data[i].companyName + '</a></td>' +
						'<td><i class="fa fa-search"></i></td>' +
						'</tr>';
				}
				$("#company-list-modal tbody").html(htmlStr);
				$("#company-list-modal").modal('show');
			},
			error: function(error) {
				console.log(error);
			}
		});
	});
})(jQuery);