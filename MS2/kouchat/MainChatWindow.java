package com.android.test;

import android.os.SystemClock;
import android.support.test.filters.LargeTest;
import android.support.test.rule.ActivityTestRule;
import android.support.test.runner.AndroidJUnit4;

import net.usikkert.kouchat.android.R;
import net.usikkert.kouchat.android.controller.MainChatController;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import static android.support.test.espresso.Espresso.onView;
import static android.support.test.espresso.action.ViewActions.click;
import static android.support.test.espresso.action.ViewActions.typeText;
import static android.support.test.espresso.assertion.ViewAssertions.matches;
import static android.support.test.espresso.matcher.ViewMatchers.isDisplayed;
import static android.support.test.espresso.matcher.ViewMatchers.withId;
import static android.support.test.espresso.matcher.ViewMatchers.withParent;
import static android.support.test.espresso.matcher.ViewMatchers.withSubstring;
import static android.support.test.espresso.matcher.ViewMatchers.withText;
import static org.hamcrest.core.AllOf.allOf;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class MainChatWindow {
    @Rule
    public ActivityTestRule<MainChatController> mActivityRule =
            new ActivityTestRule<>(MainChatController.class);

    @Test
    public void sendMessageExpectOwn() {
        String msg="Hello all my pals";
        SystemClock.sleep(3000);
        onView(withId(R.id.mainChatInput)).perform(typeText(msg+"\n"));
        onView(withId(R.id.mainChatView)).check(matches(withSubstring(msg)));

    }
    @Test
    public void viewMenu() {
        onView(withId(R.id.mainChatMenu)).perform(click());
        onView(allOf(withId(R.id.title),withText("Settings"))).check(matches(isDisplayed()));
    }

    @Test
    public void navigateSettings() {
        onView(withId(R.id.mainChatMenu)).perform(click());
        onView(allOf(withId(R.id.title),withText("Settings"))).perform(click());
        onView(allOf(withParent(withId(R.id.action_bar)),withText("Settings"))).check(matches(isDisplayed()));
    }

    @Test
    public void navigateAbout() {
        onView(withId(R.id.mainChatMenu)).perform(click());
        onView(allOf(withId(R.id.title),withText("About"))).perform(click());
        onView(withId(R.id.alertTitle)).check(matches(withSubstring("KouChat")));
    }
}


