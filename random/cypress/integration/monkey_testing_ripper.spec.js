const seedrandom = require('seedrandom');
const uuidv4 = require('uuid/v4');

describe('Website under monkey testing', function() {
    it('visit the baseUrl website and survive monkeys', function() {
        cy.visit('');
        randomEvent();
    })

    it('clean all the state successfully', function () {
        if (generateScenario) {
            const filePath = `${scenariosPath}/scenarios.json`;
            const jsonScenarios = JSON.stringify({ logs: scenarioLogs }, null, 4);
            cy.writeFile(filePath, jsonScenarios);
        }
    })
})

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
};

const TRIALS_LIMIT = 100;
const MIN_TEXT_LENGTH = 5;
const MAX_TEXT_LENGTH = 100;
const TEXT_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

let monkeysLeft = Cypress.env('maxEvents');
const baseUrl = Cypress.env('baseUrl');
const randomSeed = Cypress.env('randomSeed');
const scenariosPath = Cypress.env('scenariosPath');
seedrandom(randomSeed, { global: true });

let scenarioLogs = [];
const generateScenario = Cypress.env('generateScenario');

function getRandomText() {
    let text = '';
    const textLength = getRandomInt(MIN_TEXT_LENGTH, MAX_TEXT_LENGTH);
    for (let i = 0; i < textLength; ++i) {
        const pos = getRandomInt(0, TEXT_CHARSET.length-1);
        text += TEXT_CHARSET[pos];
    }
    return text;
}

function hasSameDomain(href) {
    var urlPattern = /^https?:\/\//i;
    if (urlPattern.test(href)) {
        const url1 = new URL(href);
        const url2 = new URL(baseUrl);
        return url1.hostname === url2.hostname;
    } else {
        return true;
    }
}

function randomLink() {
    return cy.get('a').then($items => {
        if ($items.length > 0) {
            const randomItem = $items.get(getRandomInt(0, $items.length));
            const href = randomItem.getAttribute('href');
            if (!Cypress.dom.isHidden(randomItem) && hasSameDomain(href)) {

                if (generateScenario) {
                    cy.screenshot();
                    scenarioLogs.push({
                        id: uuidv4(),
                        eventType: 'randomLink',
                        tag: 'a',
                        tagId: randomItem.getAttribute('id'),
                        tagClasses: randomItem.getAttribute('class'),
                        href: href
                    });
                }

                cy.wrap(randomItem).click({ force: true });
                monkeysLeft--;
            }
        }
    });
}

function randomTextInput() {
    return cy.get('input').then($items => {
        if ($items.length > 0) {
            var randomItem = $items.get(getRandomInt(0, $items.length));
            if (!Cypress.dom.isHidden(randomItem)) {
                const randomText = getRandomText();

                if (generateScenario) {
                    cy.screenshot();
                    scenarioLogs.push({
                        id: uuidv4(),
                        eventType: 'randomTextInput',
                        tag: 'input',
                        tagId: randomItem.getAttribute('id'),
                        tagClasses: randomItem.getAttribute('class'),
                        text: randomText
                    });
                }

                cy.wrap(randomItem).type(randomText, { force: true });
                monkeysLeft--;
            }
        }
    });
}

function randomButton() {
    return cy.get('button').then($items => {
        if ($items.length > 0) {
            var randomItem = $items.get(getRandomInt(0, $items.length));
            if (!Cypress.dom.isHidden(randomItem)) {

                if (generateScenario) {
                    cy.screenshot();
                    scenarioLogs.push({
                        id: uuidv4(),
                        eventType: 'randomButton',
                        tag: 'button',
                        tagId: randomItem.getAttribute('id'),
                        tagClasses: randomItem.getAttribute('class'),
                        text: randomText
                    });
                }

                cy.wrap(randomItem).click({ force: true });
                monkeysLeft--;
            }
        }
    });
}

function randomEvent(trials = 0) {
    if (trials === TRIALS_LIMIT || monkeysLeft === 0) {
        return;
    }

    var prevMonkeysLeft = monkeysLeft;
    var action = getRandomInt(1, 3);
    
    if (action === 1) {
        randomLink();
    } else if (action === 2) {
        randomButton();
    } else {
        randomTextInput();
    }

    if (monkeysLeft !== prevMonkeysLeft) {
        randomEvent(0);
    } else {
        randomEvent(trials+1);
    }
}