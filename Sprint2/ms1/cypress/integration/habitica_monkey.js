function login(user, pass) {
  cy.get('a[href="/login"]').click();
  cy.get('#usernameInput').click().type(user);
  cy.get('#passwordInput').click().type(pass);
  cy.get('.btn.btn-info').click();
}


describe('Los estudiantes under monkeys', function() {
    it('visits los estudiantes and survives monkeys', function() {
        cy.visit('https://habitica.com');
        login('jdfTest', 'jdfTest');
        cy.wait(1000);
        randomEvent(10);
    });
});

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
function randomClick(monkeysLeft, randomCallback=randomClick) {
    if(monkeysLeft > 0) {
        cy.get('a').then($links => {
            var randomLink = $links.get(getRandomInt(0, $links.length));
            if(!Cypress.dom.isHidden(randomLink)) {
                cy.wrap(randomLink).click({force: true});
                monkeysLeft = monkeysLeft - 1;
            }
            cy.wait(1000);
            randomCallback(monkeysLeft);
        });
    }
}

function randomText(monkeysLeft, randomCallback=randomText) {
    if(monkeysLeft > 0) {
      cy.get('input').then($inputs => {
          var textToInput = generateRandomText();
          var randomInput = $inputs.get(getRandomInt(0, $inputs.length));
          var type = randomInput.type.toLowerCase();
          if (!(type == 'button' || type == 'radio' || type == 'checkbox' || type == 'submit' || type == 'reset')) {
              cy.wrap(randomInput).type(textToInput + '{enter}', {force: true});
          } else {
              cy.wrap(randomInput).click({force: true});
          }
          monkeysLeft = monkeysLeft - 1;
          cy.wait(1000);
          randomCallback(monkeysLeft);
      });
    }
}

function randomComboBox(monkeysLeft, randomCallback=randomComboBox) {
    if(monkeysLeft > 0) {
      cy.get('select').then($selects => {
          var randomSelect = $selects.get(getRandomInt(0, $selects.length));
          var options = randomSelect.children;
          var valueList = [];
          for (var i = 0; i <  options.length; i++) {
            if (!options[i].disabled) {
              valueList.push(options[i].value);
            }
          }
          var randomValue = valueList[getRandomInt(0, valueList.length)];
          cy.wrap(randomSelect).select(randomValue, {force: true});
          monkeysLeft = monkeysLeft - 1;
          cy.wait(1000);
          randomCallback(monkeysLeft);
      });
    }
}

function randomButtonClick(monkeysLeft, randomCallback=randomButtonClick) {
    if(monkeysLeft > 0) {
      cy.get('button').then($buttons => {
          var randomButton = $buttons.get(getRandomInt(0, $buttons.length));
          if(!Cypress.dom.isHidden(randomButton)) {
              console.log('clicked ' + randomButton);
              cy.wrap(randomButton).click({force: true});
              monkeysLeft = monkeysLeft - 1;
          }
          cy.wait(1000);
          randomCallback(monkeysLeft);
      });
    }
}

function randomEvent(monkeysLeft) {
  var eventToDo = getRandomInt(0, 4); // retorna entre [0, 4), osea [0, 3]
  if (eventToDo == 0) {
    randomClick(monkeysLeft, randomEvent);
  } else if (eventToDo == 1) {
    randomText(monkeysLeft, randomEvent);
  } else if (eventToDo == 2) {
    randomComboBox(monkeysLeft, randomEvent);
  } else {
    randomButtonClick(monkeysLeft, randomEvent);
  }
}

function generateRandomText() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
  var length = getRandomInt(1, 30);
  var string = '';
  for (var i = 0; i < length; i++) {
    string += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return string;
}
