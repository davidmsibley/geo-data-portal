package gov.usgs.cida.gdp.wps.algorithm;

/**
 *
 * @author tkunicki
 */
public abstract class BoundDescriptor<T extends Class<?>> extends Descriptor {

    private final T binding;

	BoundDescriptor(Builder<? extends Builder<?,T>, T> builder) {
        super(builder);
		this.binding = builder.binding;
    }

    public T getBinding() {
        return binding;
    }

    static abstract class Builder<B extends Builder<B,T>, T extends Class<?>> extends Descriptor.Builder<B> {

        private final T binding;

        protected Builder(T binding) {
            this.binding = binding;
        }

        @Override
        public abstract BoundDescriptor<T> build();
    }
    
}
