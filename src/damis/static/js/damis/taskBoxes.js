(function() {
	window.taskBoxes = {
		assembleBoxHTML: function(boxName, icoUrl) {
			var closeIco = '<a href="#"><i class="component-tooltip icon-remove"></i></a>';
			return '<div class="task-box"><img src=\"' + icoUrl + '\" width=\"64px\" height=\"64px\" />' + closeIco + '<div class=\"desc\"><div>' + boxName + '</div></div></div>';
		},

		countBoxes: 0,

		// remove all endpoints of a task box
		removeEndpoints: function(taskBoxId) {
			var epoints = jsPlumb.getEndpoints(taskBoxId);
			var epoints2 = [];
			if (epoints) {
				$.each(epoints, function(idx, e) {
					epoints2.push(e);
				});
				var len = epoints2.length;
				while (len--) {
					jsPlumb.deleteEndpoint(epoints2[len]);
				}
			}
		},

		removeTaskBox: function(taskBox) {
			var formWindow = $("#" + window.taskBoxes.getFormWindowId(taskBox));
			formWindow.find(".delete-row").click(); // remove task form
			formWindow.remove(); // remove the window
			// all connections are automatically detached
			// so this box outgoing connections input parameters are
			// reset by "connectionDetached" event handler
			window.taskBoxes.removeEndpoints(taskBox.attr("id"));
			taskBox.remove(); // remove task box
		},

		// modify box name according to algorithm selection
		setBoxName: function(taskBoxId, title) {
			var nameContainer = $("#" + taskBoxId).find(".desc div");
			nameContainer.html(title);
		},

		// delete existing endpoints and create new ones to reflect the
		// selected algorithm
		recreateEndpoints: function(taskBoxId, formWindow) {
			// Remove old endpoints
			window.taskBoxes.removeEndpoints(taskBoxId);
			// Add new endpoints for input/output parameters
			var parameters = formWindow.find('.parameter-values');

			var outAnchors = ["Right", "BottomRight", "TopCenter"];
			var oIdx = 0;
			var inAnchors = ["Left", "BottomLeft", "BottomCenter"];
			var iIdx = 0;

			var taskBox = $("#" + taskBoxId);

			// inspect each parameter form
			// each form has one "value" field and
			// an indicator field: "connection_type"
			$.each(parameters.find('div'), function(idx) {
				var connectionType = $(this).find("input[id$='connection_type']").val();
				var paramName = "<span>" + $(this).find("span").text() + "</span>";

				if (connectionType === "INPUT_CONNECTION") {
					//add input endpoint
					window.endpoints.addEndpoint(true, taskBox, inAnchors[idx], {
						iParamNo: idx,
						iTaskBoxId: taskBoxId
					});
					iIdx++;
				} else if (connectionType === "OUTPUT_CONNECTION") {
					//add output endpoint
					window.endpoints.addEndpoint(false, taskBox, outAnchors[oIdx], {
						oParamNo: idx,
						oTaskBoxId: taskBoxId
					});
					oIdx++;
				}
			});
		},

		// Loads parameters for the selected algorithm
		loadAlgorithmParameters: function(algorithmInput) {
			$.ajax({
				url: parametersUrl,
				data: {
					algorithm_id: algorithmInput.val(),
					prefix: algorithmInput.attr('name')
				},
				context: $(this)
			}).done(function(resp) {
				// replace old parameter formset with a new one
				var formWindow = algorithmInput.closest('.task').parent();
				formWindow.find(".parameter-values").html(resp);

				var taskBoxId = window.taskBoxes.getBoxId(formWindow);
				window.taskBoxes.recreateEndpoints(taskBoxId, formWindow);
			});
		},

		// create modal window
		createTaskFormDialog: function(taskForm, existingParameters, formWindowId, title) {
			var taskFormContainer = $("<div></div>");
			taskFormContainer.attr("id", formWindowId);
			taskFormContainer.addClass("task-window");
			taskFormContainer.append(taskForm);
			if (existingParameters) {
				taskFormContainer.append(existingParameters);
			} else {
				taskFormContainer.append("<div class=\"parameter-values\"></div>");
			}
			taskFormContainer.dialog({
				title: title,
				autoOpen: false,
				appendTo: "#task-forms",
				modal: true,
				// Cancel button should return the box to a previous state, but
				// that is too complicated for now, so no Cancel button
				buttons: window.taskBoxes.defaultDialogButtons(),
				open: function() {
					var dialog = $(this).closest(".ui-dialog");
					dialog.find(".ui-dialog-titlebar > button").remove();
				}
			});

			var componentType = window.componentSettings.getComponentDetails({
				formWindowId: formWindowId
			})['type'];
			$.each(window.eventObservers.eventObservers, function(idx, o) {
				if (o.init) {
					o.init(componentType, taskFormContainer);
				}
			});
		},

		defaultDialogButtons: function() {
			return [{
				"text": gettext("OK"),
				"class": "btn",
				"click": function(ev) {
					$(this).dialog("close");
				}
			}]
		},

		// create a new task box and modal window, assign event handlers 
		createTaskBox: function(ev, ui, taskContainer) {
			// create a task form for this box
			var addTaskBtn = $("a.add-row")
			addTaskBtn.click();
			var taskForm = addTaskBtn.prev();

			//set algorithm ID into the task form
			var algorithmId = $(ui.draggable).find("input").val();
			var algorithmInput = taskForm.find(".algorithm-selection select");
			algorithmInput.val(algorithmId);

			// drop the task where it was dragged
			var componentLabel = window.componentSettings.getComponentDetails({
				formWindow: taskForm
			})['label'];
			var icoUrl = $(ui.draggable).find("img").attr("src");
			var taskBox = $(window.taskBoxes.assembleBoxHTML(componentLabel, icoUrl));
			taskBox.appendTo(taskContainer);
			taskBox.css("left", ui.position.left + "px");
			taskBox.css("top", ui.position.top + "px");

			//assign id
			count = window.taskBoxes.countBoxes;
			window.taskBoxes.countBoxes++;
			taskBox.attr("id", "task-box-" + count);

			// create modal window for the form
			window.taskBoxes.createTaskFormDialog(taskForm, null, window.taskBoxes.getFormWindowId(taskBox), componentLabel);

			this.addTaskBoxEventHandlers(taskBox);

			// asynchronous Ajax-loading of parameters, so don't add code below
			window.taskBoxes.loadAlgorithmParameters(algorithmInput);
		},

		//adds task box event handlers: delete task box, dbclick, and makes it
		//draggable
		addTaskBoxEventHandlers: function(taskBox) {

			// delete task box on right-click
			var closeIco = taskBox.find(".icon-remove");
			closeIco.off("click");
			closeIco.on("click", function(ev) {
				var taskBox = $(ev.target).closest(".task-box");
				window.taskBoxes.removeTaskBox(taskBox);
			});

			// open dialog on dbclick
			taskBox.off("dbclick");
			taskBox.on("dblclick", function(ev) {
				var boxId = $(ev.currentTarget).attr("id");
				var formWindowId = window.taskBoxes.getFormWindowId(boxId);
				var formWindow = $("#" + formWindowId);
				var componentType = window.componentSettings.getComponentDetails({
					formWindow: formWindow
				})['type'];

				$.each(window.eventObservers.eventObservers, function(idx, o) {
					if (o.doubleClick) {
						o.doubleClick(componentType, formWindow);
					}
				});

				formWindow.dialog('open');
			});

			//make the box draggable
			jsPlumb.draggable(taskBox, {
				grid: [20, 20],
				containment: "parent"
			});
		},

		//generates task box id from the provided task form 
		getBoxId: function(formWindow) {
			var windowId = formWindow instanceof $ ? formWindow.attr("id") : formWindow;
			return windowId.replace("-form", "");
		},

		// generates task form id from the provided task box
		getFormWindowId: function(taskBox) {
			return taskBox instanceof $ ? taskBox.attr("id") + "-form": taskBox + "-form";
		},
	}

})();
