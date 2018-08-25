const habiticaUrl = 'https://habitica.com/';


function login(user, pass) {
  cy.get('a[href="/login"]').click();
  cy.get('#usernameInput').click().type(user);
  cy.get('#passwordInput').click().type(pass);
  cy.get('.btn.btn-info').click();
}

function addHabit(habit) {
  addGeneric(habit, 'habit');
}

function addToDo(todo) {
  addGeneric(todo, 'todo');
}

function addDaily(daily) {
  addGeneric(daily, 'daily');
}

function addGeneric(name, type) {
  cy.get('.' + type + ' .quick-add').click().type(name + "{enter}");
}

function deleteTask(name) {
  cy.contains(name).click();
  cy.get('.delete-task-btn').click();
  cy.on('window:confirm', (str) => { return true; });
}

describe('Habitica login', function() {

    beforeEach(function () {
      cy.visit(habiticaUrl);
    });

    it('should fail at login', function() {
        login('wrongUser', 'asdfqwer');
        cy.get('.notification.callout.animated.error.positive');
    });

    it('should login correctly', function() {
      login('jdfTest', 'jdfTest');
      cy.contains('jdfTest');
    });
});

describe('Tasks', function() {

    before(function () {
      cy.visit(habiticaUrl);
      login('jdfTest', 'jdfTest');
    });

    it('should add and delete habit', function() {
        addHabit('my habit');
        deleteTask('my habit');
    });

    it('should add and delete to-do', function() {
        addToDo('my todo');
        deleteTask('my todo');
    });

    it('should add and delete daily', function() {
        addDaily('my daily');
        deleteTask('my daily');
    });

    it('should mark habit as completed', function() {
        addHabit('my habit');
        cy.get('.task-control.habit-control').first().click();
        cy.contains('+1');
        deleteTask('my habit');
    });

    it('should mark daily as completed', function() {
        addDaily('my daily');
        cy.get('.daily .task-control.daily-todo-control').first().click({force: true});
        cy.get('.daily .task-control.task-disabled-daily-todo-control-inner').first().click({force: true});
        deleteTask('my daily');
    });

    it('should mark todo as completed', function() {
        addToDo('my todo');
        cy.get('.todo .task-control.daily-todo-control').first().click({force: true});
    });

    it('should search for task', function() {
      addHabit('habit to find');
      cy.get('.tasks-navigation input.input-search').click().type('habit to find');
      cy.get('.habit').contains('habit to find');
      deleteTask('habit to find');
    });
});

describe('Rewards', function() {

    before(function () {
      cy.visit(habiticaUrl);
      login('jdfTest', 'jdfTest');
    });

    it('shouldn\'t buy reward, not enough coins', function() {
        cy.get('.reward-items .shop_armoire').click();
        cy.get('.notification.callout.animated.error.positive');
    });
});
