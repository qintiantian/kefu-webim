// 以下调用会缓存参数
// getVisitorId
// getProjectId
// getToken

easemobim.apiHelper = (function (utils, api, emajax) {
	var config;
	var cache = {};

	function getCurrentServiceSession(){
		return new Promise(function(resolve, reject){
			api('getCurrentServiceSession', {
				tenantId: config.tenantId,
				orgName: config.orgName,
				appName: config.appName,
				imServiceNumber: config.toUser,
				id: config.user.username
			}, function (msg) {
				resolve(msg.data);
			}, function (err){
				reject(err);
			});
		});
	}

	function getSessionQueueId(){
		return new Promise(function(resolve, reject){
			api('getSessionQueueId', {
				tenantId: config.tenantId,
				visitorUsername: config.user.username,
				techChannelInfo: config.orgName + '%23' + config.appName + '%23' + config.toUser
			}, function (msg) {
				resolve(msg.data);
			}, function(err){
				reject(err);
			});
		});
	}

	function getToken(){
		return new Promise(function(resolve, reject){
			var token = config.user.token;
			if (token){
				resolve(token);
			}
			else {
				emajax({
					url: location.protocol + '//' + config.restServer + '/' + config.orgName +
						'/' + config.appName + '/token',
					dataType: 'json',
					data: {
						grant_type: 'password',
						username: config.user.username,
						password: config.user.password
					},
					type: 'POST',
					success: function(resp){
						var token = resp.access_token;

						// cache token
						config.user.token = token;
						resolve(token);
					},
					error: function(err){
						reject(err);
					}
				});
			}
		});
	}

	function getProjectId(){
		return new Promise(function(resolve, reject){
			if (cache.projectId){
				resolve(cache.projectId);
			}
			else {
				getToken().then(function(token){
					api('getProject', {
						tenantId: config.tenantId,
						'easemob-target-username': config.toUser,
						'easemob-appkey': config.appKey.replace('#', '%23'),
						'easemob-username': config.user.username,
						headers: { Authorization: 'Easemob IM ' + token }
					}, function (msg) {
						var projectId = utils.getDataByPath(msg, 'data.entities.0.id');
						if (projectId){
							// cache projectId
							cache.projectId = projectId;
							resolve(projectId);
						}
						else {
							reject('no project id exist.');
						}
					}, function(err){
						reject(err);
					});
				});
			}
		});
	}

	function createTicket(opt){
		var data = opt.data;

		return new Promise(function(resolve, reject){
			easemobim.api('createTicket', {
				tenantId: config.tenantId,
				'easemob-target-username': config.toUser,
				'easemob-appkey': config.appKey.replace('#', '%23'),
				'easemob-username': config.user.username,
				origin_type: 'webim',
				headers: { Authorization: 'Easemob IM ' + opt.token },
				projectId: opt.projectId,
				subject: '',
				content: opt.content,
				status_id: '',
				priority_id: '',
				category_id: '',
				creator: {
					name: opt.name,
					avatar: '',
					email: opt.mail,
					phone: opt.phone,
					qq: '',
					company: '',
					description: ''
				},
				attachments: null
			}, function (msg) {
				isSending = false;
				if (utils.getDataByPath(msg, 'data.id')) {
					resolve();
				}
				else {
					reject('unknown errow.');
				}
			}, function(err){
				reject(err);
			});
		});
	}

	function getVisitorId(){
		return new Promise(function(resolve, reject){
			if (cache.visitorId){
				resolve(cache.visitorId);
			}
			else {
				getToken().then(function(token){
					api('getVisitorInfo', {
						tenantId: config.tenantId,
						orgName: config.orgName,
						appName: config.appName,
						userName: config.user.username,
						imServiceNumber: config.toUser,
						token: token
					}, function (msg) {
						var visitorId = utils.getDataByPath(msg, 'data.entities.userId');
						if (visitorId){
							// cache visitor id
							cache.visitorId = visitorId;
							resolve(visitorId);
						}
						else {
							reject('visitor id is not exist.');
						}
					}, function(err){
						reject(err);
					});
				});
			}
		});
	}

	function getOfficalAccounts(){
		return new Promise(function(resolve, reject){
			getToken().then(function(token){
				api('getOfficalAccounts', {
					tenantId: config.tenantId,
					orgName: config.orgName,
					appName: config.appName,
					userName: config.user.username,
					token: token
				}, function (msg) {
					var list = utils.getDataByPath(msg, 'data.entities');
					if (_.isArray(list)){
						resolve(list);
					}
					else {
						reject('unexpect data format.');
					}
				}, function(err){
					reject(err);
				});
			});
		});
	}

	function getOfficalAccountMessage(opt){
		 var params = opt.params;

		// todo test this pattern
		return new Promise(function(resolve, reject){
			Promise.all([
				getVisitorId(),
				getToken()
			]).then(function(result){
				var visitorId = result[0];
				var token = result[1];

				api('getOfficalAccountMessage', {
					tenantId: config.tenantId,
					orgName: config.orgName,
					appName: config.appName,
					userName: config.user.username,
					token: token,
					visitorId: visitorId,
					officalAccountId: params.officalAccountId,
					direction: 'before',
					size: params.size,
					startId: params.startId
				}, function (msg) {
					var list = utils.getDataByPath(msg, 'data.entities');
					if (_.isArray(list)){
						resolve(list);
					}
					else {
						reject('unexpect data format.');
					}
				}, function(err){
					reject(err);
				});
			})
			['catch'](function(err){
				reject(err);
			});
		});
	}

	return {
		getCurrentServiceSession: getCurrentServiceSession,
		getSessionQueueId: getSessionQueueId,
		getToken: getToken,
		getProjectId: getProjectId,
		createTicket: createTicket,
		getVisitorId: getVisitorId,
		getOfficalAccounts: getOfficalAccounts,
		getOfficalAccountMessage: getOfficalAccountMessage,
		init: function(cfg){
			config = cfg;
		}
	};
}(easemobim.utils, easemobim.api, easemobim.emajax));