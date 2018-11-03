var seedrandom = require('seedrandom');

describe('Website under monkey testing', function() {
    it('visit the baseUrl website and survive monkeys', function() {
        cy.visit('');
        randomEvent();
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
seedrandom(randomSeed, { global: true });

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

function randomLink(monkeysLeft) {
    return cy.get('a').then($items => {
        if ($items.length > 0) {
            const randomItem = $items.get(getRandomInt(0, $items.length));
            const href = randomItem.getAttribute('href');
            if (!Cypress.dom.isHidden(randomItem) && hasSameDomain(href)) {
                cy.wrap(randomItem).click({ force: true });
                monkeysLeft--;
            }
        }
    });
}

function randomTextInput(monkeysLeft) {
    return cy.get('input').then($items => {
        if ($items.length > 0) {
            var randomItem = $items.get(getRandomInt(0, $items.length));
            if (!Cypress.dom.isHidden(randomItem)) {
                cy.wrap(randomItem).type(getRandomText(), { force: true });
                monkeysLeft--;
            }
        }
    });
}

function randomButton(monkeysLeft) {
    return cy.get('button').then($items => {
        if ($items.length > 0) {
            var randomItem = $items.get(getRandomInt(0, $items.length));
            if (!Cypress.dom.isHidden(randomItem)) {
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
        randomLink(1);
    } else if (action === 2) {
        randomButton(1);
    } else {
        randomTextInput(1);
    }

    if (monkeysLeft !== prevMonkeysLeft) {
        randomEvent(0);
    } else {
        randomEvent(trials+1);
    }
}