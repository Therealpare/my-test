var app = angular.module('orgApp', ['dndLists']);

app.controller('OrgController', function ($scope, $timeout) {

    $scope.positions = [
        { id: 1, name: 'CEO' },
        { id: 2, name: 'IT Support' },
        { id: 3, name: 'IT 01' },
        { id: 4, name: 'IT 02' },
        { id: 5, name: 'Financer' }
    ];

    $scope.levels = [
        { level: 1, nodes: [] },
        { level: 2, nodes: [] },
        { level: 3, nodes: [] },
        { level: 4, nodes: [] }
    ];
    $scope.permissionOptions = [
        { key: 'approveLeave', label: 'Approve Leave' },
        { key: 'viewLeave', label: 'View Leave' },
        { key: 'approveExpense', label: 'Approve Expense' },
        { key: 'viewExpense', label: 'View Expense' }
    ];

    $scope.connections = [];

    $scope.showPositionModal = false;
    $scope.showParentModal = false;
    $scope.showNoParentModal = false;
    
    $scope.showDeleteModal = false;
    $scope.nodeToDelete = null;

    $scope.parentCandidates = [];
    $scope.selectedParent = null;
    $scope.pendingDrop = null;
    $scope.parentLevel = null;
    $scope.noParentLevel = null;

    $scope.onDrop = function (item, level) {
        if (!item) return false;

        var newItem = angular.copy(item);
        newItem.originalId = item.id;
        newItem.id = Date.now();
        newItem.permissions = {
            approveLeave: false,
            viewLeave: false,
            approveExpense: false,
            viewExpense: false
        };

        if (level.level === 1) {
            newItem.level = 1;
            newItem.parentId = null;
            level.nodes.push(newItem);

            $scope.positions = $scope.positions.filter(p => p.id !== item.id);

            $timeout(drawConnections);
            return false;
        }

        var parents = getParentNodes(level.level - 1);

        //ไม่มี parent
        if (parents.length === 0) {
            $scope.noParentLevel = level.level - 1;
            $scope.showNoParentModal = true;
            return false;
        }
        $scope.draggingItemName = newItem.name;
        $scope.targetLevel = level.level;

        $scope.parentCandidates = parents;
        $scope.parentLevel = level.level - 1;
        $scope.pendingDrop = { item: newItem, level: level, sourceItem: item };
        //$scope.selectedParent = null;
        $scope.parentSelection = { selected: null };
        $scope.showParentModal = true;

        return false; //หยุด drop แปบ
    };
    
    $scope.hasSelectedPermission = function () {
        if (!$scope.pendingDrop || !$scope.pendingDrop.item.permissions) {
            return false;
        }

        var p = $scope.pendingDrop.item.permissions;
        return p.approveLeave || p.viewLeave || p.approveExpense || p.viewExpense;
    };


    function getParentNodes(levelNumber) {
        var level = $scope.levels.find(l => l.level === levelNumber);
        return level ? level.nodes : [];
    }

    $scope.confirmParent = function () {
        console.log('CONFIRM CLICKED', $scope.parentSelection.selected);
        if (!$scope.selectedParent) {
            alert('Please select a parent node');
            return;
        }

        if (!$scope.selectedParent || !$scope.pendingDrop) return;
        var item = $scope.pendingDrop.item;
        var level = $scope.pendingDrop.level;
        //var sourceItem = $scope.pendingDrop.sourceItem;

        item.parentId = $scope.selectedParent.id;
        item.parentName = $scope.selectedParent.name;
        item.level = level.level;

        level.nodes.push(item);
        $scope.positions = $scope.positions.filter(p => p.id !== sourceItem.id);
        $scope.showParentModal = false;
        $scope.pendingDrop = null;
        $scope.parentSelection.selected = null;
        $timeout(drawConnections);
    };

    $scope.closeParentModal = function () {
        $scope.showParentModal = false;
        $scope.pendingDrop = null;
        $scope.selectedParent = null;
    };

    $scope.closeNoParentModal = function () {
        $scope.showNoParentModal = false;
    };

    $scope.confirmDelete = function (node) {
        $scope.nodeToDelete = node;
        $scope.showDeleteModal = true;
    };
    
    $scope.deleteConfirmed = function () {
        if (!$scope.nodeToDelete) return;

        deleteNodeAndReattach($scope.nodeToDelete);

        $scope.nodeToDelete = null;
        $scope.showDeleteModal = false;
    };

    function deleteNodeAndReattach(node) {
        var parentId = node.parentId;

        var children = [];
        $scope.levels.forEach(l => {
            l.nodes.forEach(n => {
                if (n.parentId === node.id) {
                    children.push(n);
                }
            });
        });

        children.forEach(child => {
            child.parentId = parentId;
            child.level = node.level;
        });
        
        $scope.levels.forEach(l => {
            l.nodes = l.nodes.filter(n => n.id !== node.id);
        });

        $timeout(drawConnections);
    }

    $scope.addLevel = function () {
        $scope.levels.push({
            level: $scope.levels.length + 1,
            nodes: []
        });
        $timeout(drawConnections);
    };

    $scope.removeLevel = function (level) {
        var ok = confirm('ต้องการลบ Level นี้หรือไม่?');
        if (!ok) return;

        $scope.levels = $scope.levels.filter(l => l.level !== level.level);
        $scope.levels.forEach((l, i) => l.level = i + 1);

        $timeout(drawConnections);
    };

    $scope.openPositionModal = function () {
        $scope.newPosition = {};
        $scope.showPositionModal = true;
    };

    $scope.closePositionModal = function () {
        $scope.showPositionModal = false;
    };

    $scope.createPosition = function (form) {
        if (form.$invalid) return;

        $scope.positions.push({
            id: Date.now(),
            name: $scope.newPosition.name,
            salaryType: $scope.newPosition.salaryType
        });

        $scope.showPositionModal = false;
        form.$setPristine();
        form.$setUntouched();
    };

    function drawConnections() {
        $scope.connections = [];

        setTimeout(() => {
            $scope.levels.forEach(level => {
                level.nodes.forEach(node => {
                    if (!node.parentId) return;

                    var parentEl = document.getElementById('node-' + node.parentId);
                    var childEl = document.getElementById('node-' + node.id);
                    if (!parentEl || !childEl) return;

                    var p = parentEl.getBoundingClientRect();
                    var c = childEl.getBoundingClientRect();
                    var container = document.querySelector('.org-container').getBoundingClientRect();

                    var x1 = p.left + p.width / 2 - container.left;
                    var y1 = p.bottom - container.top;
                    var x2 = c.left + c.width / 2 - container.left;
                    var y2 = c.top - container.top;

                    var path = ` M ${x1} ${y1}
                                C ${x1} ${y1 + 40},
                                ${x2} ${y2 - 40},
                                ${x2} ${y2}`;
                    
                    $scope.connections.push({
                        path: path,
                        color: '#ab47bc'
                    });
                });
            });
        });
    }
});


document.querySelectorAll('.modal-backdrop').length

