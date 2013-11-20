;
(function() {
	window.taskBoxes = {
		countBoxes: 0,

		// Maps task boxes to their endpoints
		taskBoxesToEndpoints: {},

		// remove all endpoints of a task box
		removeEndpoints: function(taskBoxId) {
			var epoints = window.taskBoxes.taskBoxesToEndpoints[taskBoxId];
			if (epoints && epoints.ipoints) {
				$.each(epoints.ipoints, function(idx, e) {
					jsPlumb.deleteEndpoint(e);
				});
			}
			if (epoints && epoints.opoints) {
				$.each(epoints.opoints, function(idx, e) {
					jsPlumb.deleteEndpoint(e);
				})
			}
		},

		// Right-click on task box
		taskBoxRightClick: function(ev) {
			if (ev.button == 2) {
				var taskBox = $(ev.target);
				var formWindow = $("#" + window.taskBoxes.getFormWindowId(taskBox));
				jsPlumb.detachAllConnections(taskBox); // remove connections
				// TODO: reset values in the forms corresponding to this
				// connection
				formWindow.find(".delete-row").click(); // remove task form
				formWindow.remove(); // remove the window
				taskBox.remove(); // remove task box
				window.taskBoxes.removeEndpoints(taskBox.attr("id"));
			}
		},

		// Initialization required after a different algorithm has been
		// selected 
		handleAlgorithmChange: function(formWindow) {
			var taskBoxId = window.taskBoxes.getBoxId(formWindow);

			window.taskBoxes.removeEndpoints(taskBoxId);

			// Add new endpoints for input/output parameters
			var taskBox = $("#" + taskBoxId);
			taskBox.html(formWindow.find(".task-form select[id$='-algorithm']").find("option:selected").text());
			var parameters = formWindow.find('.parameter-values');

			var outAnchors = ["RightMiddle", [1, 0, 1, 1], [1, 1, 1, 1]];
			var oIdx = 0;
			var inAnchors = ["LeftMiddle", [0, 0, - 1, - 1], [0, 1, - 1, - 1]];
			var iIdx = 0;

			var ipoints = []
			var opoints = []

			$.each(parameters.find('div'), function() {
				var valId = $(this).find("input[id$='-value']").attr("id");
				var parameterFormPrefix = valId.replace("-value", "");

				var isIn = $(this).find("input[id$='is_input']").val();
				var isOut = $(this).find("input[id$='is_output']").val();

				if (isIn === "True") {
					//add input endpoint
					var x = jsPlumb.addEndpoint(taskBox, window.experimentCanvas.getTargetEndpoint(), {
						anchor: inAnchors[iIdx],
						parameters: {
							inParam: valId
						}
					});
					ipoints.push(x);
					iIdx++;
				} else if (isOut === "True") {
					//add output endpoint
					var y = jsPlumb.addEndpoint(taskBox, window.experimentCanvas.getSourceEndpoint(), {
						anchor: outAnchors[oIdx],
						parameters: {
							outParam: parameterFormPrefix
						}
					});
					opoints.push(y);
					oIdx++;
				}
			});
			window.taskBoxes.taskBoxesToEndpoints[taskBoxId] = {
				"ipoints": ipoints,
				"opoints": opoints
			}
		},
        
        // Loads parameters for the selected algorithm
		loadAlgorithmParameters: function() {
			$.ajax({
				url: parametersUrl,
				data: {
					algorithm_id: $(this).val(),
					prefix: $(this).attr('name')
				},
				context: $(this)
			}).done(function(resp) {
				var formWindow = $(this).closest('.task').parent();
				formWindow.find(".parameter-values").html(resp);
				window.taskBoxes.handleAlgorithmChange(formWindow);
			});
		},
        
		createTaskFormDialog: function(taskForm, existingParameters, formWindowId) {
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
				autoOpen: false,
				appendTo: "#task-forms",
				modal: true,
				// Cancel button should return the box to a previous state, but
				// that is too complicated for now, so no Cancel button
				buttons: [{
					text: "Close",
					click: function(ev) {
						$(this).dialog("close");
					}
				}]
			});
		},

		// Initialize a new task box to accept double click events 
		initTaskBox: function(ev, ui, taskContainer) {
			// drop the task where it was dragged
			var taskBox = $("<div>New task</div>");
			taskBox.appendTo(taskContainer);
			taskBox.css("left", ui.position.left + "px");
			taskBox.css("top", ui.position.top + "px");

			//assign id and class
			count = window.taskBoxes.countBoxes;
			window.taskBoxes.countBoxes++;
			taskBox.attr("id", "task-box-" + count);
			taskBox.addClass("task-box");
			taskBox.on("mousedown", this.taskBoxRightClick);

			//create modal window with form fields
			// click add form btn 
			var addTaskBtn = $("a.add-row")
			addTaskBtn.click();

			// get generated form
			var taskForm = addTaskBtn.prev();
			taskForm.find(".algorithm-selection select").change(window.taskBoxes.loadAlgorithmParameters);
			window.taskBoxes.createTaskFormDialog(taskForm, null, window.taskBoxes.getFormWindowId(taskBox));

			taskBox.on('dblclick', function(ev) {
				var formWindowId = window.taskBoxes.getFormWindowId($(ev.currentTarget));
				$("#" + formWindowId).dialog('open');
			});

			//make it draggable
			jsPlumb.draggable(taskBox, {
				grid: [20, 20],
				containment: "parent"
			});
		},

		//generates task box id from the provided task form 
		getBoxId: function(formWindow) {
			return formWindow.attr("id").replace("-form", "");
		},

		//generates task form id from the provided task box
		getFormWindowId: function(taskBox) {
			return taskBox.attr("id") + "-form";
		},
	}

})();
