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

    $scope.showParentModal = false;
    $scope.showNoParentModal = false;

    $scope.parentCandidates = [];
    $scope.parentSelection = { selected: null };
    $scope.pendingDrop = null;
    
    $scope.showDeleteModal = false;
    $scope.nodeToDelete = null;
    $scope.deleteChildrenCount = 0;

    $scope.showPositionModal = false;
    $scope.newPosition = {};
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
    $scope.closeNoParentModal = function () {
        $scope.showNoParentModal = false;
    };

    $scope.onDrop = function (item, level) {
        if (!item) return false;

        var newItem = angular.copy(item);
        newItem.originalId = item.id;
        newItem.id = Date.now();

        const colors = ['#1976d2', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00acc1'];
        newItem.color = colors[Math.floor(Math.random() * colors.length)];

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

        if (parents.length === 0) {
            $scope.showNoParentModal = true;
            return false;
        }

        $scope.parentCandidates = parents;
        $scope.parentSelection.selected = null;

        $scope.pendingDrop = {item: newItem, level: level, sourceItem: item};

        $scope.showParentModal = true;
        return false;
    };

    function getParentNodes(levelNumber) {
        var level = $scope.levels.find(l => l.level === levelNumber);
        return level ? level.nodes : [];
    }

    $scope.confirmParent = function () {

        if (!$scope.parentSelection.selected || !$scope.pendingDrop) {
            alert('Please select a parent node');
            return;
        }

        var item = $scope.pendingDrop.item;
        var level = $scope.pendingDrop.level;
        var sourceItem = $scope.pendingDrop.sourceItem;

        item.parentId = $scope.parentSelection.selected.id;
        item.parentName = $scope.parentSelection.selected.name;
        item.level = level.level;

        level.nodes.push(item);

        $scope.positions = $scope.positions.filter( p => p.id !== sourceItem.id );

        $scope.showParentModal = false;
        $scope.pendingDrop = null;
        $scope.parentSelection.selected = null;

        $timeout(drawConnections);
    };

    $scope.closeParentModal = function () {
        $scope.showParentModal = false;
        $scope.pendingDrop = null;
        $scope.parentSelection.selected = null;
    };

    function drawConnections() {
        $scope.connections = [];
        setTimeout(() => {
            $scope.levels.forEach(level => {
                level.nodes.forEach(parent => {

                    const children = [];
                    $scope.levels.forEach(l => {
                        l.nodes.forEach(n => {
                            if (n.parentId === parent.id) {
                                children.push(n);
                            }
                        });
                    });

                    if (!children.length) return;

                    const parentEl = document.getElementById('node-' + parent.id);
                    if (!parentEl) return;

                    const p = parentEl.getBoundingClientRect();
                    const container = document.querySelector('.org-container').getBoundingClientRect(); 

                    const px = p.left + p.width / 2 - container.left;
                    const py = p.bottom - container.top;

                    const midY = py + 40;

                    $scope.connections.push({
                        path: `M ${px} ${py} L ${px} ${midY}`,
                        color: parent.color || '#3f51b5'
                    });

                    children.forEach(child => {
                        const childEl = document.getElementById('node-' + child.id);
                        if (!childEl) return;

                        const c = childEl.getBoundingClientRect();
                        const cx = c.left + c.width / 2 - container.left;
                        const cy = c.top - container.top;

                        const path = `
                            M ${px} ${midY}
                            C ${px} ${midY + 20},
                            ${cx} ${cy - 20},
                            ${cx} ${cy}
                        `;

                        $scope.connections.push({
                            path: path,
                            color: parent.color || '#3f51b5'
                        });
                    });
                });
            });
        });
    }
    $scope.confirmDelete = function (node) {
        console.log('DELETE CLICKED:', node);

        $scope.$applyAsync(() => {
            $scope.nodeToDelete = node;
            $scope.deleteChildrenCount = 0;

            $scope.levels.forEach(l => {
                l.nodes.forEach(n => {
                    if (n.parentId === node.id) {
                        $scope.deleteChildrenCount++;
                    }
                });
            });

            $scope.showDeleteModal = true;
        });
    };

    $scope.cancelDelete = function () {
        $scope.showDeleteModal = false;
        $scope.nodeToDelete = null;
        $scope.deleteChildrenCount = 0;
    };
    
    $scope.confirmDeleteYes = function () {
        if (!$scope.nodeToDelete) return;
        const node = $scope.nodeToDelete;

        let children = [];
        $scope.levels.forEach(l => {
            l.nodes.forEach(n => {
                if (n.parentId === node.id) {
                    children.push(n);
                }
            });
        });

        children.forEach(child => {
            $scope.positions.push({
                id: child.originalId || Date.now(),
                name: child.name
            });
        });

        $scope.levels.forEach(l => {
            l.nodes = l.nodes.filter(n =>
                n.id !== node.id && n.parentId !== node.id
            );
        });

        $scope.showDeleteModal = false;
        $scope.nodeToDelete = null;
        $scope.deleteChildrenCount = 0;

        $timeout(drawConnections);
    };
});
