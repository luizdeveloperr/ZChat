const uid = new ShortUniqueId()
var replying = ""
const socket = io(undefined, {
	reconnection: false
});
var index = 0

function getCookie(name) {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop()
		.split(';')
		.shift();
}

function setCookie(name, value, days) {
	var expires = "";
	if (days) {
		var date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		expires = "; expires=" + date.toUTCString();
	}
	document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
var user;

async function addMessage(message) {
	var stamp = uid.parseStamp(message.id)
	await $("#chatArea")
		.prepend(`<div id="chatBlock" class="${message.replying?.user == user.username ? "reference" : ""}"><img class="pfp" src="${message.avatar || "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBw4PDw8QDw4NDw4PEA0QDRAODQ8PDg8PFhEWFiARFhYYHSggGSYlGxMTITEhJSk6Li4uFyszODMsNygtLisBCgoKBQUFDgUFDisZExkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//AABEIAOAA4AMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAABQYBAwQCB//EADAQAQACAAMGAwcFAQEAAAAAAAABAgMEEQUSITFBUWFxkSJCgaHB0fAyUmJy4SMT/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/APogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2YWXvf8ATW0+OnD1dNdl409Kx52BxDttsvGjpWfKzmxcven6q2jx04eoNYAAAAAAAAAAAAAAAAAAADDL3g4U3tFa85/NQZwMG153axrPyjxlNZXZlKcbaXt4xwj4OjKZauHXSPjPWZ7t4MRDIAMTDIDgzWzKX410pbwj2Z+CFx8G1J3bRpPynxhaWjN5auJXSfhPWJ7grDL3jYU0tNbc45/d4AAAAAAAAAAAAAAAAATexsvpXfnnbl5IWldZiO8xHrwWrDrERERyiIiAegAAAAAAARu2cvrXfjnXn5IRa8SsTExPKYmJVW9dJmO0zHpwBgAAAAAAAAAAAAAAAG/Ix/1w/wC0LKrOTtpiUn+ULMDIAAAAAAAMK1no/wCuJ/aVlVnOW1xLz/KfsDSAAAAAAAAAAAAAAAB+QtGWxYvSto6x81WSmxszpM4c8p408+wJoIAAAAAAJBqzOLFKWtPSPmq/5KT2zmdZjDjlE638+yLBkAAAAAAAAAAAAAAAAiewAndnbQi8btuF+nazvVNI5Xatq8LxvR3ifa/0E4ObBz2FfleIntbhPzdETqDIxM6OfGz2FTneJntXjPyB0I/aOfikbteN+varkzW1bW4UjdjvM+1/iOAmQAAAAAAAAAAAAAAAAAAAAb8DJ4l+VZ07zwgHO9RM959Ulh7Ht714jyjWW+uxqdb3n0gENMz3n1eU3bY1Ol7x6S0Ymx7e7eJ8LRoCMG/HyeJTnWdO8cYaAAAAAAAAAAAAAAAAAAAYdWUyN8TlGlf3Ty+Hd2ZDZmulsSPKv1n7JeI0ByZbZ+Hh9N63e30h2AAAAAA48zs/DxOm7bvX6w7AFbzeRvh841r+6OXx7OVbZjVEZ/ZmntYfxr9Y+wIoAAAAAAAAAAAAABMbMyG7pe8e17sT7vi07Iym9O/aPZj9Md57psGNGQAAAAAAAAAY0ZARW08hva3pHte9Ee94odbUJtfKbs/+lY9mf1R2nuCNAAAAAAAAAAbMvgze0Vjr17R3akzsPA4WvPOeFfIEnhUisRWI0iOEPQAAAAAAAAAAAAAPOLSLRNZjWJ4S9AKtmMGaWms9OveO7WmNuYHCt45xwt5IYGQAAAAAAAY/IWnLYUUpWsdIj1VzKU3sSkd7Qs8AyAAAAAAAAAAAAAAADVmcKL0tWesT6qstsqxm6buJeO1pBqAAAB//2Q=="}"><div id="messageLeftSide"><p class="small opaque" id="author${message.id}">${message.author ?? "anonymous"}</p><p id="message${message.id}"></p></div><div id="messageRightSide"><p class="small opaque" style="float: right;">${String(stamp).split(" ")[4]}</p><p style="float: right; border-right: 2px solid #fafafa50; padding-right: 2px; margin-right: 2px;" id="replywrapper_${message.id}" class="replywrapper" onclick='$("#replybar").html(\`<i class="fas fa-reply fa-fade"></i> | Replying to ${message.author}\’s message<inl style="float: right; font-weight: 900; margin-right: 3px;" onclick="$(&apos;#replybar&apos;).addClass(&apos;hidden&apos;); replying =&apos;&apos;">X</inl>\`).removeClass("hidden"); $("body").scrollTop($("body")[0].scrollHeight); replying = "${message.id}"'><i class="fas fa-reply"></i></p></div></div>`)

	if (message.replying?.message) $(`#message${message.id}`)
		.append(`<div class="replyingmessage small opaque">replying to ${message.replying.user}: ${$(`#message${message.replying?.message}`).html() ?? "<i>unknown message.</i>"}</div>`)
	$(`#message${message.id}`)
		.append(document.createTextNode(message.content))

	lastmsgauthor = message.author
	$('#textInputBox')
		.trigger('focus')
	index++
}
var form = document.getElementById("textSubmitForm")
var textbox = document.getElementById("textInputBox")

socket.on("connect", async () => {
	socket.on("userData", (data) => user = data)
	socket.on("cookie", (name, value) => setCookie(name, value))
	var typing = []
	$(textbox)
		.on("keyup", () => {
			if ($(textbox)
				.val()
				.length === 0) {
				socket.emit("typing", {
					author: decodeURIComponent(user.username)
					, typing: false
				})
			} else {
				socket.emit("typing", {
					author: decodeURIComponent(user.username)
					, typing: true
				})
			}
		})


	form.onsubmit = function() {
		console.log(uid.stamp(20))
		socket.emit("message", {
			content: textbox.value
			, author: decodeURIComponent(user.username)
			, id: uid.stamp(20)
			, replying: {
				user: $(`#author${replying}`)
					.html()
				, message: replying
			},
			avatar: user.avatar
		})
		textbox.value = ""
		socket.emit("typing", {
			author: user.username
			, typing: false
		})
		$("#replybar")
			.addClass("hidden")
		replying = ""
		return false
	}
	socket.on("messageClient", (message) => {
		addMessage(message)
		console.log(message)
	})
	socket.on("typing", (data) => {
		var index = typing.findIndex(x => x == data.author)
		if (!data.typing) {
			if (index > -1) typing.splice(index, 1)
		} else {
			if (index < 0 && data.author != user.username) typing.push(data.author)
		}
		if (typing.length != 0) {
			$("#typingbar")
				.html(`<i class="fas fa-spinner fa-pulse"></i> ${typing.join(", ")} ${typing.length == 1 ? "is" : "are"} typing...`)
				.addClass("visible")
				.removeClass("hidden")
		} else {
			$("#typingbar")
				.addClass("hidden")
				.removeClass("visible")
		}
		$('body')
			.scrollTop($('body')[0].scrollHeight)
	})
})

socket.on("redirect", (data) => {
	socket.disconnect()
	window.location.href = data
})
