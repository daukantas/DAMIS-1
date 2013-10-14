///////////////////////////////////////////////////////////
//  SMACOF.cpp
//  Implementation of the Class SMACOF
//  Created on:      07-Lie-2013 20:07:32
//  Original author: Povilas
///////////////////////////////////////////////////////////

#include "SMACOF.h"
#include "ShufleObjects.h"

SMACOF::SMACOF(){

}

SMACOF::~SMACOF(){

}

/**
 * Constructor for SMACOF object
 */
SMACOF::SMACOF(float eps, int maxIter, int d):MDS(eps, maxIter, d){
    
}

/**
 * Constructor called from SMACOF class
 */
SMACOF::SMACOF(float eps, int maxIter, int d, ObjectMatrix X, ObjectMatrix Y):MDS(eps, maxIter, d){

}

/**
 * Pure virtual method that calculates the projection
 */
ObjectMatrix SMACOF::getProjection(){

    iteration = 0;
    int n = X.getObjectCount();
    double oldStressError = getStress();
    double newStressError = 0.0;
    double tmpStressError = oldStressError;
    double sum = 0.0;
    ObjectMatrix Gutman;
    ObjectMatrix Y_new(n);
    std::vector<double> Y_newRow;
    Y_newRow.reserve(d);

    while (iteration < getMaxIteration() && (oldStressError - newStressError) > getEpsilon())
    {
        Y_new.DataObjects.clear();
        oldStressError = tmpStressError;
        Gutman = getGutman();
        for (int i=0; i < n; i++)
        {
            Y_newRow.clear();
            for (int j = 0; j < d; j++)
            {
                sum = 0.0;
                for (int k = 0; k < n; k++)
                        sum += Gutman.getObjectAt(i).getItems().at(k) * Y.getObjectAt(k).getItems().at(j);
                Y_newRow.push_back(sum / n);
                //Y.getObjectAt(i).getItems().at(j) = sum / n;
            }
            Y_new.addObject(DataObject(Y_newRow));
        }
        Y = Y_new;
        newStressError = getStress();
        tmpStressError = newStressError;
        iteration++;
    }
    //iteration = getMaxIteration();
    stress = oldStressError - newStressError;
    return Y;
}

ObjectMatrix SMACOF::getX()
{
    return X;
}

//double SMACOF::getStress()
//{
//    return 100.0009;
//}