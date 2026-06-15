import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarShowLabel: true,

        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#94A3B8',

        tabBarStyle: styles.tabBar,

        tabBarLabelStyle: styles.tabLabel,

        tabBarItemStyle: styles.tabItem,

        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ride',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon
              icon={focused ? 'car' : 'car-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon
              icon={focused ? 'calendar' : 'calendar-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon
              icon={focused ? 'wallet' : 'wallet-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon
              icon={focused ? 'person' : 'person-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function AnimatedIcon({
  icon,
  color,
  focused,
}: {
  icon: any;
  color: string;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View
      style={[
        styles.iconWrapper,
        focused && styles.activeIconWrapper,
        {
          transform: [{ scale }],
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={focused ? '#FFFFFF' : color}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',

    left: 12,
    right: 12,
    

    height: 100,

    

    backgroundColor: '#ffffff',

    borderTopWidth: 0,

    elevation: 20,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,

    paddingTop: 6,
    paddingBottom: 10,
  },

  tabItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  iconWrapper: {
    width: 28,
    height: 27,

    borderRadius: 5,

    justifyContent: 'center',
    alignItems: 'center',
  },

  activeIconWrapper: {
    backgroundColor: '#10B981',

    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,

    elevation: 8,
  },
});