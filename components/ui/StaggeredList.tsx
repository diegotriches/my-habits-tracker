// components/ui/StaggeredList.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface StaggeredListProps {
  children: React.ReactNode;
  staggerDelay?: number;
  itemDelay?: number;
  style?: ViewStyle;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  staggerDelay = 50,
  itemDelay = 0,
  style,
}) => {
  const childrenArray = React.Children.toArray(children);

  return (
    <Animated.View style={style}>
      {childrenArray.map((child, index) => (
        <StaggeredItem
          key={index}
          delay={itemDelay + (index * staggerDelay)}
        >
          {child}
        </StaggeredItem>
      ))}
    </Animated.View>
  );
};

interface StaggeredItemProps {
  children: React.ReactNode;
  delay: number;
}

const StaggeredItem: React.FC<StaggeredItemProps> = ({ children, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY }],
      }}
    >
      {children}
    </Animated.View>
  );
};